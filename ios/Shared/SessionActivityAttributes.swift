import ActivityKit
import Foundation

/// The Lock Screen and Dynamic Island timer while an activity is running.
struct SessionActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var endsAt: Date
    }

    var title: String
    var symbol: String
    var placeName: String?
    var startedAt: Date
}
