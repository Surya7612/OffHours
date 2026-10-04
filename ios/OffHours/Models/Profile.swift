import Foundation

struct Profile: Codable, Equatable, Sendable {
    var id: UUID
    var displayName: String
    var interests: [String]
    var nudgeHour: Int
    var nudgeMinute: Int
    var radiusKm: Int
    var gatheringAlerts: Bool = false
    /// Rounded to about 1 km by the server; only set while gathering alerts are on.
    var alertLat: Double?
    var alertLng: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case displayName = "display_name"
        case interests
        case nudgeHour = "nudge_hour"
        case nudgeMinute = "nudge_minute"
        case radiusKm = "radius_km"
        case gatheringAlerts = "gathering_alerts"
        case alertLat = "alert_lat"
        case alertLng = "alert_lng"
    }

    static let radiusOptions = [1, 3, 5, 10]

    var firstName: String {
        displayName.split(separator: " ").first.map(String.init) ?? displayName
    }

    var nudgeTime: DateComponents {
        DateComponents(hour: nudgeHour, minute: nudgeMinute)
    }
}

enum Interest: String, CaseIterable, Identifiable, Sendable {
    case walking = "Walking"
    case nature = "Nature"
    case meditation = "Meditation"
    case journaling = "Journaling"
    case reading = "Reading"
    case art = "Art"
    case music = "Music"
    case cooking = "Cooking"
    case coffeeAndTea = "Coffee & tea"
    case movement = "Movement"
    case photography = "Photography"
    case conversation = "Conversation"
    case community = "Community"
    case writing = "Writing"

    var id: String { rawValue }

    var symbol: String {
        switch self {
        case .walking: "figure.walk"
        case .nature: "leaf"
        case .meditation: "brain.head.profile"
        case .journaling: "book.closed"
        case .reading: "books.vertical"
        case .art: "paintbrush"
        case .music: "music.note"
        case .cooking: "frying.pan"
        case .coffeeAndTea: "cup.and.saucer"
        case .movement: "figure.cooldown"
        case .photography: "camera"
        case .conversation: "bubble.left.and.bubble.right"
        case .community: "person.3"
        case .writing: "pencil.line"
        }
    }
}
