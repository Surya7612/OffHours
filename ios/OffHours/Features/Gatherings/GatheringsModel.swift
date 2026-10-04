import CoreLocation
import Foundation
import Observation

@MainActor
@Observable
final class GatheringsModel {
    enum LoadState: Equatable {
        case idle, loading, loaded, needsLocation, failed(String)
    }

    private(set) var nearby: [Gathering] = []
    private(set) var going: [Gathering] = []
    private(set) var state: LoadState = .idle
    private(set) var location: CLLocation?
    /// Each load bumps this, so a slow older load can't overwrite a newer one.
    private var generation = 0

    func load(app: AppModel) async {
        guard let backend = app.backend, let profile = app.profile else { return }
        generation += 1
        let current = generation
        if nearby.isEmpty && going.isEmpty { state = .loading }

        async let mine = backend.myUpcomingGatherings()
        let here = await app.location.currentLocation()
        if let here { await app.noteLocation(here) }

        do {
            let upcoming = try await mine
            var found: [Gathering] = []
            if let here {
                found = try await backend.nearbyGatherings(
                    latitude: here.coordinate.latitude,
                    longitude: here.coordinate.longitude,
                    radiusKm: Double(profile.radiusKm)
                )
            }
            guard current == generation else { return }
            location = here
            going = upcoming.filter { !$0.hasEnded }
            nearby = found.filter { !$0.going && !$0.hasEnded }
            state = here == nil ? .needsLocation : .loaded
        } catch {
            guard current == generation else { return }
            state = .failed(error.userMessage)
        }
    }

    func join(_ gathering: Gathering, app: AppModel) async throws {
        guard let backend = app.backend, !going.contains(where: { $0.id == gathering.id }) else { return }
        try await backend.join(gatheringID: gathering.id)
        var joined = gathering
        joined.isGoing = true
        joined.attendeeCount += 1
        nearby.removeAll { $0.id == gathering.id }
        insertGoing(joined)
        await NotificationScheduler.scheduleReminder(for: joined)
        Task { await backend.sendGatheringAlert(.joined, gatheringID: gathering.id) }
    }

    /// Finds a gathering opened from a notification, using what's already loaded when possible.
    func resolve(_ id: UUID, app: AppModel) async -> Gathering? {
        if let known = (going + nearby).first(where: { $0.id == id }), !known.hasEnded { return known }
        guard let backend = app.backend, let userID = app.userID,
              let found = try? await backend.gathering(id: id, userID: userID),
              !found.hasEnded
        else { return nil }
        return found
    }

    func leave(_ gathering: Gathering, app: AppModel) async throws {
        guard let backend = app.backend, let userID = app.userID else { return }
        try await backend.leave(gatheringID: gathering.id, userID: userID)
        NotificationScheduler.cancelReminder(for: gathering.id)
        going.removeAll { $0.id == gathering.id }
        var left = gathering
        left.isGoing = false
        left.attendeeCount = max(0, left.attendeeCount - 1)
        nearby.append(left)
        nearby.sort { $0.startsAt < $1.startsAt }
    }

    /// A weekly series alerts nearby people once, for its first date.
    func created(_ gatherings: [Gathering], app: AppModel) async {
        for gathering in gatherings {
            insertGoing(gathering)
            await NotificationScheduler.scheduleReminder(for: gathering)
        }
        if let backend = app.backend, let first = gatherings.first {
            Task { await backend.sendGatheringAlert(.created, gatheringID: first.id) }
        }
    }

    func cancel(_ gathering: Gathering, app: AppModel) async throws {
        guard let backend = app.backend else { return }
        try await backend.cancel(gatheringID: gathering.id)
        removeCancelled([gathering.id], backend: backend)
    }

    /// Cancels every date in the series that hasn't started yet.
    func cancelSeries(of gathering: Gathering, app: AppModel) async throws {
        guard let backend = app.backend, let seriesID = gathering.seriesID else { return }
        let cancelled = try await backend.cancelSeries(seriesID: seriesID)
        removeCancelled(cancelled, backend: backend)
    }

    private func removeCancelled(_ ids: [UUID], backend: Backend) {
        for id in ids { NotificationScheduler.cancelReminder(for: id) }
        going.removeAll { ids.contains($0.id) }
        Task {
            for id in ids { await backend.sendGatheringAlert(.cancelled, gatheringID: id) }
        }
    }

    func updateMeetingNote(_ note: String, for gathering: Gathering, app: AppModel) async throws {
        guard let backend = app.backend else { return }
        try await backend.updateMeetingNote(gatheringID: gathering.id, note: note)
        if let index = going.firstIndex(where: { $0.id == gathering.id }) {
            going[index].meetingNote = note
            await NotificationScheduler.scheduleReminder(for: going[index])
        }
    }

    func blockHost(of gathering: Gathering, app: AppModel) async throws {
        guard let backend = app.backend else { return }
        try await backend.block(userID: gathering.hostID)
        nearby.removeAll { $0.hostID == gathering.hostID }
        for removed in going where removed.hostID == gathering.hostID {
            if let userID = app.userID {
                try? await backend.leave(gatheringID: removed.id, userID: userID)
            }
            NotificationScheduler.cancelReminder(for: removed.id)
        }
        going.removeAll { $0.hostID == gathering.hostID }
    }

    func report(_ gathering: Gathering, reason: String, app: AppModel) async throws {
        try await app.backend?.report(gathering: gathering, reason: reason)
        nearby.removeAll { $0.id == gathering.id }
    }

    private func insertGoing(_ gathering: Gathering) {
        going.removeAll { $0.id == gathering.id }
        going.append(gathering)
        going.sort { $0.startsAt < $1.startsAt }
    }
}
