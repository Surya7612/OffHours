import MapKit
import SwiftUI

struct Activity: Identifiable, Hashable, Sendable {
    enum Kind: String, CaseIterable, Sendable {
        case mindful, creative, nature, movement, social, community

        var label: String {
            switch self {
            case .mindful: "Mindful"
            case .creative: "Creative"
            case .nature: "Outdoors"
            case .movement: "Movement"
            case .social: "With someone"
            case .community: "Community"
            }
        }

        var symbol: String {
            switch self {
            case .mindful: "leaf"
            case .creative: "paintpalette"
            case .nature: "tree"
            case .movement: "figure.walk"
            case .social: "person.2"
            case .community: "hands.and.sparkles"
            }
        }

        var tint: Color {
            switch self {
            case .mindful: .teal
            case .creative: .purple
            case .nature: .green
            case .movement: .orange
            case .social: .pink
            case .community: .indigo
            }
        }
    }

    /// The kind of real place tonight's activity should be anchored to, found with MapKit.
    enum PlaceKind: String, Sendable {
        case park, waterfront, cafe, library, museum

        var categories: [MKPointOfInterestCategory] {
            switch self {
            case .park: [.park, .nationalPark]
            case .waterfront: [.beach, .marina, .park]
            case .cafe: [.cafe, .bakery]
            case .library: [.library]
            case .museum: [.museum]
            }
        }

        var noun: String {
            switch self {
            case .park: "park"
            case .waterfront: "waterfront spot"
            case .cafe: "café"
            case .library: "library"
            case .museum: "museum"
            }
        }
    }

    enum TimeOfDay: Sendable {
        case morning, afternoon, evening, night

        init(hour: Int) {
            switch hour {
            case 5..<12: self = .morning
            case 12..<17: self = .afternoon
            case 17..<21: self = .evening
            default: self = .night
            }
        }
    }

    let id: String
    let title: String
    let summary: String
    let kind: Kind
    let minutes: Int
    let interests: Set<Interest>
    let times: Set<TimeOfDay>
    var place: PlaceKind? = nil
    var bring: [String] = []
    var steps: [String] = []
}
