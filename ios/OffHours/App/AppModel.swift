import CoreLocation
import Foundation
import Observation
import Supabase

enum AppTab: Hashable {
    case tonight, gatherings, journal
}

enum AlertSetupError: LocalizedError {
    case notificationsOff, locationOff

    var errorDescription: String? {
        switch self {
        case .notificationsOff: "Turn on notifications for OffHours in Settings to get gathering alerts."
        case .locationOff: "Allow location access so we know which gatherings are near you."
        }
    }
}

@MainActor
@Observable
final class AppModel {
    enum Phase: Equatable {
        case launching
        case notConfigured
        case signedOut
        case needsProfile
        case ready
        case failed(String)
    }

    private(set) var phase: Phase = .launching
    private(set) var userID: UUID?
    private(set) var profile: Profile?
    private(set) var logs: [ActivityLog] = []
    private(set) var stats: JournalStats = .empty
    /// Apple only shares the user's name on the very first sign-in, so keep it for profile setup.
    var nameFromApple: String = ""
    var selectedTab: AppTab = .tonight
    /// Set by notification taps and the Tonight screen; the Gatherings tab opens it.
    var gatheringToOpen: UUID?
    /// Goes up each time the app comes back to the foreground, so screens can reload with `.task(id:)`.
    private(set) var activations = 0
    private var isUpdatingAlertLocation = false
    /// True when the profile came from the offline cache and still needs a real fetch.
    private var isUsingCachedProfile = false
    private var nudgeTask: Task<Void, Never>?

    let backend: Backend?
    let location = LocationService()

    init(backend: Backend? = .shared) {
        self.backend = backend
    }

    var completedToday: [ActivityLog] {
        logs.filter { Calendar.current.isDateInToday($0.completedAt) }
    }

    // MARK: Session

    func start() async {
        guard let backend else {
            phase = .notConfigured
            return
        }
        for await (event, session) in backend.client.auth.authStateChanges {
            if event == .tokenRefreshed || event == .userUpdated, session?.user.id == userID {
                continue
            }
            await apply(session: session)
        }
    }

    func retry() async {
        guard let session = backend?.client.auth.currentSession else {
            phase = .signedOut
            return
        }
        await apply(session: session)
    }

    private func apply(session: Session?) async {
        guard let backend, let session else {
            clearLocalState()
            phase = .signedOut
            return
        }
        if let previous = userID, previous != session.user.id {
            clearLocalState()
        }
        userID = session.user.id
        do {
            if let remote = try await backend.profile(id: session.user.id) {
                profile = remote
                ProfileCache.save(remote)
                isUsingCachedProfile = false
                phase = .ready
                await startPush()
                await refreshJournal()
                await syncGatheringReminders()
            } else {
                phase = .needsProfile
            }
        } catch {
            if let cached = ProfileCache.load(userID: session.user.id) {
                profile = cached
                isUsingCachedProfile = true
                phase = .ready
                await refreshJournal()
            } else {
                phase = .failed(error.userMessage)
            }
        }
    }

    func didBecomeActive() async {
        guard phase == .ready else { return }
        if isUsingCachedProfile, let session = backend?.client.auth.currentSession {
            await apply(session: session)
        } else {
            await refreshJournal()
            await syncGatheringReminders()
        }
        activations += 1
    }

    private func syncGatheringReminders() async {
        guard let backend, let upcoming = try? await backend.myUpcomingGatherings() else { return }
        await NotificationScheduler.syncReminders(with: upcoming)
    }

    func signInWithApple(idToken: String, nonce: String, fullName: PersonNameComponents?) async throws {
        guard let backend else { return }
        if let fullName {
            nameFromApple = PersonNameComponentsFormatter.localizedString(from: fullName, style: .default)
        }
        try await backend.signInWithApple(idToken: idToken, nonce: nonce)
    }

    func signOut() async {
        if let token = PushRegistrar.shared.token {
            try? await backend?.unregisterDevice(token: token)
        }
        PushRegistrar.shared.unregister()
        try? await backend?.signOut()
        clearLocalState()
        phase = .signedOut
    }

    func deleteAccount(appleAuthorizationCode: String?) async throws {
        guard let backend else { return }
        try await backend.deleteAccount(appleAuthorizationCode: appleAuthorizationCode)
        clearLocalState()
        phase = .signedOut
    }

    private func clearLocalState() {
        if let userID {
            ProfileCache.clear(userID: userID)
            TonightPersonalizationStore.clear(userID: userID)
        }
        nudgeTask?.cancel()
        NotificationScheduler.removeAll()
        PushRegistrar.shared.onToken = nil
        if userID != nil { PushRegistrar.shared.unregister() }
        WidgetBridge.clear()
        userID = nil
        profile = nil
        logs = []
        stats = .empty
        selectedTab = .tonight
        gatheringToOpen = nil
        isUsingCachedProfile = false
    }

    // MARK: Push

    private func startPush() async {
        guard let backend else { return }
        PushRegistrar.shared.onToken = { token in
            Task { try? await backend.registerDevice(token: token, environment: PushRegistrar.environment) }
        }
        if await NotificationScheduler.isAuthorized() {
            PushRegistrar.shared.register()
        }
    }

    func openGathering(_ id: UUID) {
        selectedTab = .gatherings
        gatheringToOpen = id
    }

    func handleNotificationTap(_ payload: NotificationPayload) {
        switch (payload.kind, payload.open, payload.gatheringID) {
        case ("cancelled", _, let id?):
            NotificationScheduler.cancelReminder(for: id)
            selectedTab = .gatherings
        case (_, "journal", _):
            selectedTab = .journal
        case (_, "tonight", _):
            selectedTab = .tonight
        case (_, _, let id?):
            openGathering(id)
        default:
            break
        }
    }

    func setGatheringAlerts(_ enabled: Bool) async throws {
        guard var draft = profile else { return }
        if enabled {
            guard await NotificationScheduler.requestPermission() else { throw AlertSetupError.notificationsOff }
            await startPush()
            guard let here = await location.currentLocation() else { throw AlertSetupError.locationOff }
            draft.gatheringAlerts = true
            draft.alertLat = here.coordinate.latitude
            draft.alertLng = here.coordinate.longitude
        } else {
            draft.gatheringAlerts = false
            draft.alertLat = nil
            draft.alertLng = nil
        }
        try await saveProfile(draft)
    }

    /// Keeps the rough alert location current when someone moves more than about a kilometer.
    /// Only touches the location columns, so it can't undo a change saved from Settings meanwhile.
    func noteLocation(_ location: CLLocation) async {
        guard let backend, let current = profile, current.gatheringAlerts, !isUpdatingAlertLocation else { return }
        let lat = location.coordinate.latitude
        let lng = location.coordinate.longitude
        if let oldLat = current.alertLat, let oldLng = current.alertLng, abs(oldLat - lat) < 0.01, abs(oldLng - lng) < 0.01 {
            return
        }
        isUpdatingAlertLocation = true
        defer { isUpdatingAlertLocation = false }
        guard let saved = try? await backend.updateAlertLocation(userID: current.id, latitude: lat, longitude: lng),
              profile?.gatheringAlerts == true else { return }
        profile?.alertLat = saved.alertLat
        profile?.alertLng = saved.alertLng
        if let profile { ProfileCache.save(profile) }
    }

    // MARK: Profile

    func saveProfile(_ draft: Profile) async throws {
        guard let backend else { return }
        let saved = try await backend.save(draft)
        profile = saved
        ProfileCache.save(saved)
        isUsingCachedProfile = false
        if phase != .ready {
            phase = .ready
            await startPush()
            await refreshJournal()
        } else {
            await rescheduleNudges()
        }
    }

    // MARK: Journal

    func refreshJournal() async {
        guard let backend else { return }
        if let fresh = try? await backend.activityLogs() {
            logs = fresh
            stats = JournalStats(logs: fresh)
        }
        await rescheduleNudges()
    }

    func complete(_ activity: Activity, minutes: Int, place: Place?, reflection: String?) async throws {
        try await addToJournal(NewActivityLog(
            activityID: activity.id,
            title: activity.title,
            kind: activity.kind.rawValue,
            durationMinutes: max(1, minutes),
            placeName: place?.name,
            reflection: reflection
        ))
    }

    /// Logs a gathering someone went to, so it counts toward their streak like an activity.
    func logGathering(_ gathering: GatheringToLog, reflection: String?) async throws {
        try await addToJournal(NewActivityLog(
            activityID: gathering.journalActivityID,
            title: gathering.title,
            kind: Activity.Kind.community.rawValue,
            durationMinutes: min(max(gathering.durationMinutes, 1), 600),
            placeName: gathering.placeName,
            reflection: reflection,
            completedAt: gathering.endsAt
        ))
        NotificationScheduler.cancelGatheringFollowUp(for: gathering.id)
    }

    private func addToJournal(_ entry: NewActivityLog) async throws {
        guard let backend else { return }
        let saved = try await backend.log(entry)
        logs.insert(saved, at: 0)
        logs.sort { $0.completedAt > $1.completedAt }
        stats = JournalStats(logs: logs)
        if Calendar.current.isDateInToday(saved.completedAt) {
            NotificationScheduler.cancelToday()
        }
        await rescheduleNudges()
    }

    func deleteLog(_ log: ActivityLog) async throws {
        guard let backend else { return }
        try await backend.deleteLog(id: log.id)
        logs.removeAll { $0.id == log.id }
        stats = JournalStats(logs: logs)
        await rescheduleNudges()
    }

    /// Several callers can ask at once; only the latest request runs to completion.
    private func rescheduleNudges() async {
        guard let profile else { return }
        let skipToday = !completedToday.isEmpty
        let logs = logs
        nudgeTask?.cancel()
        let task = Task {
            await NotificationScheduler.scheduleDailyNudges(for: profile, skipToday: skipToday)
            guard !Task.isCancelled else { return }
            await NotificationScheduler.scheduleWeeklyRecap(logs: logs)
        }
        nudgeTask = task
        await task.value
        publishWidget()
    }

    // MARK: Widget

    /// The activity Tonight is showing, so the widget shows the same one.
    private var tonightPick: Activity?

    func showingTonight(_ activity: Activity?) {
        guard tonightPick?.id != activity?.id else { return }
        tonightPick = activity
        publishWidget()
    }

    private func publishWidget() {
        guard let profile else { return }
        let activity = tonightPick ?? NudgePicker.pick(for: .now, profile: profile)
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: .now) ?? .now
        let next = NudgePicker.pick(for: tomorrow, profile: profile)
        WidgetBridge.publish(WidgetSnapshot(
            day: Calendar.current.startOfDay(for: .now),
            tonight: .init(activity),
            tomorrow: .init(next),
            doneToday: completedToday.first?.title,
            streak: stats.currentStreak,
            weekMinutes: WeekSummary(logs: logs).minutes
        ))
    }
}

/// Keeps the app usable offline after the first successful load.
private enum ProfileCache {
    private static func key(_ userID: UUID) -> String { "profile-\(userID.uuidString)" }

    static func save(_ profile: Profile) {
        guard let data = try? JSONEncoder().encode(profile) else { return }
        UserDefaults.standard.set(data, forKey: key(profile.id))
    }

    static func load(userID: UUID) -> Profile? {
        guard let data = UserDefaults.standard.data(forKey: key(userID)) else { return nil }
        return try? JSONDecoder().decode(Profile.self, from: data)
    }

    static func clear(userID: UUID) {
        UserDefaults.standard.removeObject(forKey: key(userID))
    }
}
