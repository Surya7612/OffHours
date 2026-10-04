import Foundation
import Testing
@testable import OffHours

struct JournalStatsTests {
    private let calendar = Calendar(identifier: .gregorian)
    private let now = ISO8601DateFormatter().date(from: "2026-10-04T20:00:00Z")!

    private func log(daysAgo: Int, minutes: Int = 20) -> ActivityLog {
        ActivityLog(
            id: UUID(),
            activityID: "breathing",
            title: "Ten slow breaths",
            kind: "mindful",
            durationMinutes: minutes,
            placeName: nil,
            reflection: nil,
            completedAt: calendar.date(byAdding: .day, value: -daysAgo, to: now)!
        )
    }

    @Test func emptyJournalHasNoStreak() {
        let stats = JournalStats(logs: [], now: now, calendar: calendar)
        #expect(stats == .empty)
    }

    @Test func consecutiveDaysEndingTodayCount() {
        let stats = JournalStats(logs: [log(daysAgo: 0), log(daysAgo: 1), log(daysAgo: 2)], now: now, calendar: calendar)
        #expect(stats.currentStreak == 3)
        #expect(stats.longestStreak == 3)
        #expect(stats.totalMinutes == 60)
    }

    @Test func notDoneYetTodayKeepsStreak() {
        let stats = JournalStats(logs: [log(daysAgo: 1), log(daysAgo: 2)], now: now, calendar: calendar)
        #expect(stats.currentStreak == 2)
    }

    @Test func missingYesterdayBreaksStreak() {
        let stats = JournalStats(logs: [log(daysAgo: 2), log(daysAgo: 3), log(daysAgo: 4), log(daysAgo: 5)], now: now, calendar: calendar)
        #expect(stats.currentStreak == 0)
        #expect(stats.longestStreak == 4)
    }

    @Test func severalMomentsInOneDayCountOnce() {
        let stats = JournalStats(logs: [log(daysAgo: 0), log(daysAgo: 0), log(daysAgo: 1)], now: now, calendar: calendar)
        #expect(stats.currentStreak == 2)
        #expect(stats.totalMoments == 3)
    }
}

struct NudgePickerTests {
    private let profile = Profile(
        id: UUID(uuidString: "6F9619FF-8B86-D011-B42D-00C04FC964FF")!,
        displayName: "Surya",
        interests: [Interest.walking.rawValue, Interest.nature.rawValue],
        nudgeHour: 18,
        nudgeMinute: 0,
        radiusKm: 3
    )

    @Test func sameDayGivesSamePick() {
        let day = Date(timeIntervalSince1970: 1_790_000_000)
        #expect(NudgePicker.pick(for: day, profile: profile) == NudgePicker.pick(for: day.addingTimeInterval(3600), profile: profile))
    }

    @Test func picksSuitTheNudgeTime() {
        let ranked = NudgePicker.ranked(for: .now, profile: profile)
        #expect(!ranked.isEmpty)
        #expect(ranked.allSatisfy { $0.times.contains(.evening) })
    }

    @Test func picksVaryAcrossTwoWeeks() {
        let start = Date(timeIntervalSince1970: 1_790_000_000)
        let picks = (0..<14).map { NudgePicker.pick(for: start.addingTimeInterval(Double($0) * 86_400), profile: profile).id }
        #expect(Set(picks).count >= 5)
    }

    @Test func libraryIDsAreUnique() {
        let ids = ActivityLibrary.all.map(\.id)
        #expect(Set(ids).count == ids.count)
    }
}
