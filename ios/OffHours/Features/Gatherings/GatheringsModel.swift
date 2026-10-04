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

    func load(app: AppModel) async {
        guard let backend = app.backend, let profile = app.profile else { return }
        if nearby.isEmpty && going.isEmpty { state = .loading }

        async let mine = backend.myUpcomingGatherings()
        let here = await app.location.currentLocation()
        location = here
        if let here { await app.noteLocation(here) }

        do {
            going = try await mine
            if let here {
                let found = try await backend.nearbyGatherings(
                    latitude: here.coordinate.latitude,
                    longitude: here.coordinate.longitude,
                    radiusKm: Double(profile.radiusKm)
                )
                nearby = found.filter { !$0.going }
                state = .loaded
            } else {
                nearby = []
                state = .needsLocation
            }
        } catch {
            state = .failed(error.userMessage)
        }
    }

    func join(_ gathering: Gathering, app: AppModel) async throws {
        guard let backend = app.backend else { return }
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
        if let known = (going + nearby).first(where: { $0.id == id }) { return known }
        guard let backend = app.backend, let userID = app.userID else { return nil }
        return try? await backend.gathering(id: id, userID: userID)
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

    func created(_ gathering: Gathering, app: AppModel) async {
        insertGoing(gathering)
        await NotificationScheduler.scheduleReminder(for: gathering)
        if let backend = app.backend {
            Task { await backend.sendGatheringAlert(.created, gatheringID: gathering.id) }
        }
    }

    func cancel(_ gathering: Gathering, app: AppModel) async throws {
        guard let backend = app.backend else { return }
        try await backend.cancel(gatheringID: gathering.id)
        NotificationScheduler.cancelReminder(for: gathering.id)
        going.removeAll { $0.id == gathering.id }
        Task { await backend.sendGatheringAlert(.cancelled, gatheringID: gathering.id) }
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
