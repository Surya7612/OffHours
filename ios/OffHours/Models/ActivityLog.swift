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

    enum CodingKeys: String, CodingKey {
        case activityID = "activity_id"
        case title
        case kind
        case durationMinutes = "duration_minutes"
        case placeName = "place_name"
        case reflection
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
