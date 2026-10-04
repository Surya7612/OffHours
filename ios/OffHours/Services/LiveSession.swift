import ActivityKit
import Foundation

/// Starts and ends the Lock Screen timer for an activity session. Everything here is best effort:
/// if Live Activities are off, the in-app timer and the end notification still work.
@MainActor
enum LiveSession {
    // `Activity` alone is the app's own activity model.
    private typealias Live = ActivityKit.Activity<SessionActivityAttributes>

    static func start(title: String, symbol: String, placeName: String?, startedAt: Date, endsAt: Date) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        end()
        let attributes = SessionActivityAttributes(title: title, symbol: symbol, placeName: placeName, startedAt: startedAt)
        let state = SessionActivityAttributes.ContentState(endsAt: endsAt)
        _ = try? Live.request(
            attributes: attributes,
            content: ActivityContent(state: state, staleDate: endsAt.addingTimeInterval(60 * 60))
        )
    }

    /// Ends the timers running now, not any started right after this call.
    static func end() {
        let ids = Set(Live.activities.map(\.id))
        guard !ids.isEmpty else { return }
        Task.detached { await endActivities(ids) }
    }

    private nonisolated static func endActivities(_ ids: Set<String>) async {
        for activity in Live.activities where ids.contains(activity.id) {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }
}

extension WidgetSnapshot.Pick {
    init(_ activity: Activity) {
        self.init(title: activity.title, minutes: activity.minutes, symbol: activity.kind.symbol, kind: activity.kind.label)
    }
}
