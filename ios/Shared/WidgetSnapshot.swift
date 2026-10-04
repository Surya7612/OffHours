import Foundation
import WidgetKit

/// What the app last showed on Tonight, saved where the widget can read it. The app writes it;
/// the widget only reads.
struct WidgetSnapshot: Codable, Equatable, Sendable {
    struct Pick: Codable, Equatable, Sendable {
        var title: String
        var minutes: Int
        var symbol: String
        var kind: String
    }

    var day: Date
    var tonight: Pick
    var tomorrow: Pick
    var doneToday: String?
    var streak: Int
    var weekMinutes: Int

    /// The pick for a moment: tonight's on the day it was saved, tomorrow's the day after.
    func pick(at date: Date, calendar: Calendar = .current) -> Pick? {
        if calendar.isDate(date, inSameDayAs: day) { return tonight }
        if let next = calendar.date(byAdding: .day, value: 1, to: day), calendar.isDate(date, inSameDayAs: next) {
            return tomorrow
        }
        return nil
    }

    func isDone(at date: Date, calendar: Calendar = .current) -> Bool {
        doneToday != nil && calendar.isDate(date, inSameDayAs: day)
    }

    static let placeholder = WidgetSnapshot(
        day: .now,
        tonight: Pick(title: "Phone-free sunset walk", minutes: 25, symbol: "tree", kind: "Outdoors"),
        tomorrow: Pick(title: "Read at a café", minutes: 40, symbol: "leaf", kind: "Mindful"),
        doneToday: nil,
        streak: 3,
        weekMinutes: 85
    )
}

enum WidgetBridge {
    static let appGroup = "group.com.suryanediyadeth.offhours"
    private static let key = "widgetSnapshot"

    private static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

    static func load() -> WidgetSnapshot? {
        guard let data = defaults?.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    }

    static func publish(_ snapshot: WidgetSnapshot) {
        guard snapshot != load(), let data = try? JSONEncoder().encode(snapshot) else { return }
        defaults?.set(data, forKey: key)
        WidgetCenter.shared.reloadAllTimelines()
    }

    static func clear() {
        defaults?.removeObject(forKey: key)
        WidgetCenter.shared.reloadAllTimelines()
    }
}
