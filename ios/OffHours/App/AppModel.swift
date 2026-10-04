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
    private var isUpdatingAlertLocation = false

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
        userID = session.user.id
        do {
            if let remote = try await backend.profile(id: session.user.id) {
                profile = remote
                ProfileCache.save(remote)
                phase = .ready
                await startPush()
                await refreshJournal()
            } else {
                phase = .needsProfile
            }
        } catch {
            if let cached = ProfileCache.load(userID: session.user.id) {
                profile = cached
                phase = .ready
            } else {
                phase = .failed(error.userMessage)
            }
        }
    }

    func didBecomeActive() async {
        guard phase == .ready else { return }
        await refreshJournal()
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
        if let userID { ProfileCache.clear(userID: userID) }
        NotificationScheduler.removeAll()
        PushRegistrar.shared.onToken = nil
        userID = nil
        profile = nil
        logs = []
        stats = .empty
        selectedTab = .tonight
        gatheringToOpen = nil
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
    func noteLocation(_ location: CLLocation) async {
        guard var draft = profile, draft.gatheringAlerts, !isUpdatingAlertLocation else { return }
        let lat = location.coordinate.latitude
        let lng = location.coordinate.longitude
        if let oldLat = draft.alertLat, let oldLng = draft.alertLng, abs(oldLat - lat) < 0.01, abs(oldLng - lng) < 0.01 {
            return
        }
        isUpdatingAlertLocation = true
        defer { isUpdatingAlertLocation = false }
        draft.alertLat = lat
        draft.alertLng = lng
        try? await saveProfile(draft)
    }

    // MARK: Profile

    func saveProfile(_ draft: Profile) async throws {
        guard let backend else { return }
        let saved = try await backend.save(draft)
        profile = saved
        ProfileCache.save(saved)
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
        guard let backend else { return }
        let entry = NewActivityLog(
            activityID: activity.id,
            title: activity.title,
            kind: activity.kind.rawValue,
            durationMinutes: max(1, minutes),
            placeName: place?.name,
            reflection: reflection
        )
        let saved = try await backend.log(entry)
        logs.insert(saved, at: 0)
        stats = JournalStats(logs: logs)
        NotificationScheduler.cancelToday()
        await rescheduleNudges()
    }

    func deleteLog(_ log: ActivityLog) async throws {
        guard let backend else { return }
        try await backend.deleteLog(id: log.id)
        logs.removeAll { $0.id == log.id }
        stats = JournalStats(logs: logs)
        await rescheduleNudges()
    }

    private func rescheduleNudges() async {
        guard let profile else { return }
        await NotificationScheduler.scheduleDailyNudges(for: profile, skipToday: !completedToday.isEmpty)
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
