import CoreLocation
import Foundation

struct Gathering: Decodable, Identifiable, Hashable, Sendable {
    var id: UUID
    var hostID: UUID
    var hostName: String
    var title: String
    var details: String
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
}

struct NewGathering: Encodable, Sendable {
    var title: String
    var details: String
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
        case startsAt = "starts_at"
        case durationMinutes = "duration_minutes"
        case placeName = "place_name"
        case placeAddress = "place_address"
        case lat
        case lng
        case capacity
    }
}
