import Foundation

struct ActivityLog: Codable, Identifiable, Hashable, Sendable {
    var id: UUID
    var activityID: String
    var title: String
    var kind: String
    var durationMinutes: Int
    var placeName: String?
    var reflection: String?
    var completedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case activityID = "activity_id"
        case title
        case kind
        case durationMinutes = "duration_minutes"
        case placeName = "place_name"
        case reflection
        case completedAt = "completed_at"
    }

    var activityKind: Activity.Kind? { Activity.Kind(rawValue: kind) }
}

struct NewActivityLog: Encodable, Sendable {
    var activityID: String
    var title: String
    var kind: String
    var durationMinutes: Int
    var placeName: String?
    var reflection: String?
    /// Defaults to now on the server when left out.
    var completedAt: Date?

    enum CodingKeys: String, CodingKey {
        case activityID = "activity_id"
        case title
        case kind
        case durationMinutes = "duration_minutes"
        case placeName = "place_name"
        case reflection
        case completedAt = "completed_at"
    }
}

/// The seven days ending at a moment, for the Sunday recap and the widget.
struct WeekSummary: Equatable, Sendable {
    var moments: Int
    var minutes: Int
    var days: Int

    init(logs: [ActivityLog], endingAt end: Date = .now, calendar: Calendar = .current) {
        let start = end.addingTimeInterval(-7 * 24 * 60 * 60)
        let week = logs.filter { $0.completedAt > start && $0.completedAt <= end }
        moments = week.count
        minutes = week.reduce(0) { $0 + $1.durationMinutes }
        days = Set(week.map { calendar.startOfDay(for: $0.completedAt) }).count
    }

    var recapText: String {
        guard moments > 0 else {
            return "A quiet week. Tonight is a good night to start again, even for ten minutes."
        }
        let time = Duration.seconds(minutes * 60).formatted(.units(allowed: [.hours, .minutes], width: .wide))
        let evenings = days == 1 ? "1 evening" : "\(days) evenings"
        return "\(evenings) offline, \(time) in total. Keep it going this week."
    }
}

struct JournalStats: Equatable, Sendable {
    var currentStreak: Int
    var longestStreak: Int
    var totalMinutes: Int
    var totalMoments: Int

    static let empty = JournalStats(currentStreak: 0, longestStreak: 0, totalMinutes: 0, totalMoments: 0)

    init(currentStreak: Int, longestStreak: Int, totalMinutes: Int, totalMoments: Int) {
        self.currentStreak = currentStreak
        self.longestStreak = longestStreak
        self.totalMinutes = totalMinutes
        self.totalMoments = totalMoments
    }

    /// A streak counts consecutive calendar days with at least one moment. Today not being done
    /// yet does not break the streak; missing yesterday does.
    init(logs: [ActivityLog], now: Date = .now, calendar: Calendar = .current) {
        totalMoments = logs.count
        totalMinutes = logs.reduce(0) { $0 + $1.durationMinutes }

        let days = Set(logs.map { calendar.startOfDay(for: $0.completedAt) }).sorted(by: >)
        guard !days.isEmpty else {
            currentStreak = 0
            longestStreak = 0
            return
        }

        var longest = 1
        var run = 1
        for (previous, day) in zip(days, days.dropFirst()) {
            if calendar.dateComponents([.day], from: day, to: previous).day == 1 {
                run += 1
            } else {
                run = 1
            }
            longest = max(longest, run)
        }
        longestStreak = longest

        let today = calendar.startOfDay(for: now)
        let yesterday = calendar.date(byAdding: .day, value: -1, to: today)!
        guard days[0] == today || days[0] == yesterday else {
            currentStreak = 0
            return
        }
        var streak = 1
        for (previous, day) in zip(days, days.dropFirst()) {
            guard calendar.dateComponents([.day], from: day, to: previous).day == 1 else { break }
            streak += 1
        }
        currentStreak = streak
    }
}
