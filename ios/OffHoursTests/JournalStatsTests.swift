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

    private func activity(
        _ id: String,
        kind: Activity.Kind = .mindful,
        minutes: Int = 20,
        place: Activity.PlaceKind? = nil
    ) -> Activity {
        Activity(
            id: id,
            title: id,
            summary: id,
            kind: kind,
            minutes: minutes,
            interests: [.walking],
            times: [.evening],
            place: place
        )
    }

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

    @Test func tonightIntentPrioritizesAPlanThatFits() {
        let shortAndFree = activity("short-free", minutes: 15)
        let longAndPaid = activity("long-paid", kind: .movement, minutes: 60, place: .cafe)
        let intent = TonightIntent(time: .quick, energy: .low, budget: .free, company: .solo)
        let ranked = NudgePicker.ranked(
            for: Date(timeIntervalSince1970: 1_790_000_000),
            profile: profile,
            library: [longAndPaid, shortAndFree],
            intent: intent
        )
        #expect(ranked.first == shortAndFree)
    }

    @Test func socialIntentPrioritizesSocialActivities() {
        let solo = activity("solo", kind: .mindful)
        let social = activity("social", kind: .social)
        let intent = TonightIntent(time: .halfHour, energy: .steady, budget: .flexible, company: .social)
        let ranked = NudgePicker.ranked(
            for: Date(timeIntervalSince1970: 1_790_000_000),
            profile: profile,
            library: [solo, social],
            intent: intent
        )
        #expect(ranked.first == social)
    }

    @Test func repeatedSkipsMoveAnActivityDown() throws {
        let one = activity("one")
        let two = activity("two")
        let date = Date(timeIntervalSince1970: 1_790_000_000)
        let initial = try #require(NudgePicker.ranked(for: date, profile: profile, library: [one, two]).first)
        var feedback = ActivityFeedback()
        for _ in 0..<3 { feedback.skipped(initial.id, reason: .notForMe) }
        let adjusted = NudgePicker.ranked(
            for: date,
            profile: profile,
            library: [one, two],
            feedback: feedback
        )
        #expect(adjusted.first?.id != initial.id)
    }

    @Test func costSkipsPushPaidActivitiesDown() {
        let free = activity("free")
        let paid = activity("paid", place: .cafe)
        let date = Date(timeIntervalSince1970: 1_790_000_000)
        var feedback = ActivityFeedback()
        for _ in 0..<3 { feedback.skipped(paid.id, reason: .costsMoney) }
        let ranked = NudgePicker.ranked(
            for: date,
            profile: profile,
            library: [paid, free],
            feedback: feedback
        )
        #expect(ranked.first == free)
    }

    @Test func likingAKindMovesSimilarActivitiesUp() throws {
        let mindful = activity("mindful", kind: .mindful)
        let movement = activity("movement", kind: .movement)
        let date = Date(timeIntervalSince1970: 1_790_000_000)
        let initial = try #require(NudgePicker.ranked(for: date, profile: profile, library: [mindful, movement]).first)
        let preferred = initial == mindful ? movement : mindful
        var feedback = ActivityFeedback()
        for _ in 0..<4 { feedback.liked(kind: preferred.kind.rawValue) }
        let ranked = NudgePicker.ranked(
            for: date,
            profile: profile,
            library: [mindful, movement],
            feedback: feedback
        )
        #expect(ranked.first == preferred)
    }

    @Test func repeatedCompletionsTeachThePicker() throws {
        let one = activity("one")
        let two = activity("two")
        let date = Date(timeIntervalSince1970: 1_790_000_000)
        let initial = try #require(NudgePicker.ranked(for: date, profile: profile, library: [one, two]).first)
        let learned = initial == one ? two : one
        let history = (0..<3).map { index in
            ActivityLog(
                id: UUID(),
                activityID: learned.id,
                title: learned.title,
                kind: learned.kind.rawValue,
                durationMinutes: learned.minutes,
                placeName: nil,
                reflection: nil,
                completedAt: date.addingTimeInterval(TimeInterval(-index * 86_400))
            )
        }
        let adjusted = NudgePicker.ranked(
            for: date,
            profile: profile,
            library: [one, two],
            history: history
        )
        #expect(adjusted.first == learned)
    }

    @Test func indoorPreferencePushesOutdoorPlansDown() {
        let indoor = activity("indoor")
        let outdoor = activity("outdoor", kind: .nature, place: .park)
        let date = Date(timeIntervalSince1970: 1_790_000_000)
        let ranked = NudgePicker.ranked(
            for: date,
            profile: profile,
            library: [outdoor, indoor],
            preferences: EveningPreferences(preferIndoor: true)
        )
        #expect(ranked.first == indoor)
    }

    @Test func freePreferencePushesPaidPlansDown() {
        let free = activity("free")
        let paid = activity("paid", place: .cafe)
        let date = Date(timeIntervalSince1970: 1_790_000_000)
        let ranked = NudgePicker.ranked(
            for: date,
            profile: profile,
            library: [paid, free],
            preferences: EveningPreferences(keepFree: true)
        )
        #expect(ranked.first == free)
    }

    @Test func plannedCalendarStartUsesTheNudgeWhenItIsStillAhead() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let morning = calendar.date(from: DateComponents(year: 2026, month: 10, day: 6, hour: 10))!
        let later = CalendarPlanner.plannedStart(hour: 18, minute: 0, now: morning, calendar: calendar)
        #expect(calendar.component(.hour, from: later) == 18)
        let earlier = CalendarPlanner.plannedStart(hour: 8, minute: 0, now: morning, calendar: calendar)
        #expect(earlier == morning)
    }

    @Test func confirmAndArriveOpenOnlyNearTheStart() {
        var gathering = Gathering(
            id: UUID(),
            hostID: UUID(),
            hostName: "Asha",
            title: "River walk",
            details: "",
            startsAt: Date(timeIntervalSince1970: 1_800_000_000),
            durationMinutes: 60,
            placeName: "Park",
            placeAddress: "",
            lat: 0,
            lng: 0,
            capacity: 4,
            attendeeCount: 2,
            isGoing: true
        )
        let start = gathering.startsAt
        #expect(!gathering.canConfirm(at: start.addingTimeInterval(-26 * 60 * 60)))
        #expect(gathering.canConfirm(at: start.addingTimeInterval(-2 * 60 * 60)))
        #expect(gathering.canArrive(at: start.addingTimeInterval(-10 * 60)))
        #expect(!gathering.canArrive(at: start.addingTimeInterval(-2 * 60 * 60)))
        gathering.confirmedAt = start
        #expect(!gathering.canConfirm(at: start.addingTimeInterval(-2 * 60 * 60)))
    }

    @Test func checkInExpiresAtMidnight() throws {
        let userID = UUID()
        let day = Date(timeIntervalSince1970: 1_790_000_000)
        let intent = TonightIntent(time: .quick, energy: .active, budget: .free, company: .either)
        TonightPersonalizationStore.save(intent, for: userID, on: day)
        #expect(TonightPersonalizationStore.intent(for: userID, on: day) == intent)
        #expect(TonightPersonalizationStore.intent(for: userID, on: day.addingTimeInterval(86_400)) == nil)
        TonightPersonalizationStore.clear(userID: userID)
    }
}
