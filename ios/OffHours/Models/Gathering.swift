import CoreLocation
import Foundation

struct Gathering: Decodable, Identifiable, Hashable, Sendable {
    var id: UUID
    var hostID: UUID
    var hostName: String
    var title: String
    var details: String
    /// How to find the group on the spot, like "by the fountain, red umbrella".
    var meetingNote: String?
    /// Shared by the dates of a weekly gathering.
    var seriesID: UUID?
    var startsAt: Date
    var durationMinutes: Int
    var placeName: String
    var placeAddress: String
    var lat: Double
    var lng: Double
    var capacity: Int
    var attendeeCount: Int
    var distanceKm: Double?
    var isGoing: Bool?

    enum CodingKeys: String, CodingKey {
        case id
        case hostID = "host_id"
        case hostName = "host_name"
        case title
        case details
        case meetingNote = "meeting_note"
        case seriesID = "series_id"
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

    enum CodingKeys: String, CodingKey {
        case id = "user_id"
        case displayName = "display_name"
        case joinedAt = "joined_at"
    }
}

struct NewGathering: Encodable, Sendable {
    var title: String
    var details: String
    var meetingNote: String
    var seriesID: UUID?
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
        case startsAt = "starts_at"
        case durationMinutes = "duration_minutes"
        case placeName = "place_name"
        case placeAddress = "place_address"
        case lat
        case lng
        case capacity
    }
}
