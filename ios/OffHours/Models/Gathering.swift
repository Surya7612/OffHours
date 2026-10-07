import CoreLocation
import Foundation

struct Gathering: Decodable, Identifiable, Hashable, Sendable {
    var id: UUID
    var hostID: UUID
    var hostName: String
    var title: String
    var details: String
    /// How to find the group on the spot, like "by the fountain, red umbrella".
    var meetingNote: String? = nil
    /// Shared by the dates of a weekly gathering.
    var seriesID: UUID? = nil
    var isPrivate: Bool? = nil
    var inviteCode: String? = nil
    var rsvpClosesAt: Date? = nil
    var isWaiting: Bool? = nil
    var confirmedAt: Date? = nil
    var arrivedAt: Date? = nil
    var startsAt: Date
    var durationMinutes: Int
    var placeName: String
    var placeAddress: String
    var lat: Double
    var lng: Double
    var capacity: Int
    var attendeeCount: Int
    var distanceKm: Double? = nil
    var isGoing: Bool? = nil

    enum CodingKeys: String, CodingKey {
        case id
        case hostID = "host_id"
        case hostName = "host_name"
        case title
        case details
        case meetingNote = "meeting_note"
        case seriesID = "series_id"
        case isPrivate = "is_private"
        case inviteCode = "invite_code"
        case rsvpClosesAt = "rsvp_closes_at"
        case isWaiting = "is_waiting"
        case confirmedAt = "confirmed_at"
        case arrivedAt = "arrived_at"
        case startsAt = "starts_at"
        case durationMinutes = "duration_minutes"
        case placeName = "place_name"
        case placeAddress = "place_address"
        case lat
        case lng
        case capacity
        case attendeeCount = "attendee_count"
        case distanceKm = "distance_km"
        case isGoing = "is_going"
    }

    var coordinate: CLLocationCoordinate2D { .init(latitude: lat, longitude: lng) }
    var endsAt: Date { startsAt.addingTimeInterval(TimeInterval(durationMinutes * 60)) }
    var spotsLeft: Int { max(0, capacity - attendeeCount) }
    var isFull: Bool { spotsLeft == 0 }
    var going: Bool { isGoing ?? false }
    var hasEnded: Bool { endsAt <= .now }
    var waiting: Bool { isWaiting ?? false }
    var rsvpClosed: Bool {
        guard let rsvpClosesAt else { return false }
        return rsvpClosesAt <= .now
    }

    /// The day before it starts, once someone is going.
    func canConfirm(at now: Date = .now) -> Bool {
        going && confirmedAt == nil && now >= startsAt.addingTimeInterval(-24 * 60 * 60) && now < startsAt
    }

    /// From half an hour before the start until it ends.
    func canArrive(at now: Date = .now) -> Bool {
        going && arrivedAt == nil && now >= startsAt.addingTimeInterval(-30 * 60) && now < endsAt
    }
    var meetingSpot: String? {
        guard let meetingNote, !meetingNote.isEmpty else { return nil }
        return meetingNote
    }
}

/// A gathering someone went to that has ended and isn't in their journal yet.
struct GatheringToLog: Decodable, Identifiable, Hashable, Sendable {
    var id: UUID
    var title: String
    var placeName: String
    var startsAt: Date
    var durationMinutes: Int

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case placeName = "place_name"
        case startsAt = "starts_at"
        case durationMinutes = "duration_minutes"
    }

    var endsAt: Date { startsAt.addingTimeInterval(TimeInterval(durationMinutes * 60)) }
    var journalActivityID: String { "gathering-\(id.uuidString.lowercased())" }
}

struct Attendee: Decodable, Identifiable, Hashable, Sendable {
    var id: UUID
    var displayName: String
    var joinedAt: Date
    var confirmedAt: Date?
    var arrivedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id = "user_id"
        case displayName = "display_name"
        case joinedAt = "joined_at"
        case confirmedAt = "confirmed_at"
        case arrivedAt = "arrived_at"
    }

    var statusLabel: String? {
        if arrivedAt != nil { return "Here" }
        if confirmedAt != nil { return "Confirmed" }
        return nil
    }
}

struct GatheringAnnouncement: Decodable, Identifiable, Hashable, Sendable {
    var id: UUID
    var body: String
    var createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case body
        case createdAt = "created_at"
    }
}

/// Tonight turned into a two-person plan. The host can still change the details before posting.
struct GatheringSeed: Identifiable {
    var id = UUID()
    var title: String
    var details: String
    var durationMinutes: Int
    var place: Place?
}

struct NewGathering: Encodable, Sendable {
    var title: String
    var details: String
    var meetingNote: String
    var seriesID: UUID?
    var isPrivate: Bool = false
    var inviteCode: String?
    var rsvpClosesAt: Date?
    var startsAt: Date
    var durationMinutes: Int
    var placeName: String
    var placeAddress: String
    var lat: Double
    var lng: Double
    var capacity: Int

    enum CodingKeys: String, CodingKey {
        case title
        case details
        case meetingNote = "meeting_note"
        case seriesID = "series_id"
        case isPrivate = "is_private"
        case inviteCode = "invite_code"
        case rsvpClosesAt = "rsvp_closes_at"
        case startsAt = "starts_at"
        case durationMinutes = "duration_minutes"
        case placeName = "place_name"
        case placeAddress = "place_address"
        case lat
        case lng
        case capacity
    }
}
