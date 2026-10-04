import Foundation
import Testing
@testable import OffHours

struct SunCalculatorTests {
    private func calendar(_ zone: String) -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: zone)!
        return calendar
    }

    private func local(_ text: String, _ calendar: Calendar) -> Date {
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.timeZone = calendar.timeZone
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        return formatter.date(from: text)!
    }

    @Test func newYorkMidsummer() throws {
        let nyc = calendar("America/New_York")
        let sunset = try #require(SunCalculator.sunset(on: local("2026-06-21 09:00", nyc), latitude: 40.7128, longitude: -74.0060, calendar: nyc))
        #expect(abs(sunset.timeIntervalSince(local("2026-06-21 20:31", nyc))) < 5 * 60)
    }

    @Test func londonMidwinter() throws {
        let london = calendar("Europe/London")
        let sunset = try #require(SunCalculator.sunset(on: local("2026-12-21 09:00", london), latitude: 51.5074, longitude: -0.1278, calendar: london))
        #expect(abs(sunset.timeIntervalSince(local("2026-12-21 15:53", london))) < 5 * 60)
    }

    @Test func honoluluStaysOnTheLocalDay() throws {
        // Sunset there is after midnight UTC, so the UTC day is one ahead.
        let honolulu = calendar("Pacific/Honolulu")
        let sunset = try #require(SunCalculator.sunset(on: local("2026-10-04 09:00", honolulu), latitude: 21.3069, longitude: -157.8583, calendar: honolulu))
        #expect(abs(sunset.timeIntervalSince(local("2026-10-04 18:20", honolulu))) < 8 * 60)
    }

    @Test func noSunsetInPolarSummer() {
        let oslo = calendar("Europe/Oslo")
        #expect(SunCalculator.sunset(on: local("2026-06-21 12:00", oslo), latitude: 78.22, longitude: 15.65, calendar: oslo) == nil)
    }
}

struct EveningConditionsTests {
    private let profile = Profile(
        id: UUID(uuidString: "6F9619FF-8B86-D011-B42D-00C04FC964FF")!,
        displayName: "Surya",
        interests: [Interest.walking.rawValue, Interest.nature.rawValue],
        nudgeHour: 18,
        nudgeMinute: 0,
        radiusKm: 3
    )
    private let start = Date(timeIntervalSince1970: 1_790_000_000)

    @Test func wetWeatherPutsIndoorPicksFirst() {
        let wet = EveningConditions(weather: .wet)
        for day in 0..<14 {
            let date = start.addingTimeInterval(Double(day) * 86_400)
            let base = NudgePicker.ranked(for: date, profile: profile)
            let (ranked, reason) = NudgePicker.tonight(for: date, profile: profile, conditions: wet)
            #expect(ranked.count == base.count)
            #expect(ranked.first?.isOutdoor == false)
            #expect((reason != nil) == (base.first?.isOutdoor == true))
        }
    }

    @Test func clearWeatherKeepsTheUsualOrder() {
        let clear = EveningConditions(weather: .clear, sunset: start.addingTimeInterval(3600))
        let (ranked, reason) = NudgePicker.tonight(for: start, profile: profile, conditions: clear)
        #expect(ranked == NudgePicker.ranked(for: start, profile: profile))
        #expect(reason == nil)
    }

    @Test func darknessOnlyMovesDaylightActivities() {
        let dark = EveningConditions(weather: .clear, sunset: start.addingTimeInterval(-2 * 3600))
        let (ranked, _) = NudgePicker.tonight(for: start, profile: profile, conditions: dark)
        let firstDaylight = ranked.firstIndex(where: \.needsDaylight) ?? ranked.count
        let rest = ranked[firstDaylight...]
        #expect(rest.allSatisfy { $0.needsDaylight })
        #expect(ActivityLibrary.activity(id: "night-sky")?.needsDaylight == false)
    }

    @Test func sunsetHintCountsBackFromSunset() throws {
        let walk = try #require(ActivityLibrary.activity(id: "sunset-walk"))
        let conditions = EveningConditions(sunset: start.addingTimeInterval(3600))
        let hint = try #require(conditions.sunsetHint(for: walk, at: start))
        #expect(hint.contains("Head out by"))
        #expect(conditions.sunsetHint(for: walk, at: start.addingTimeInterval(2 * 3600)) == nil)
        let indoor = try #require(ActivityLibrary.activity(id: "cafe-reading"))
        #expect(conditions.sunsetHint(for: indoor, at: start) == nil)
    }
}

struct WeekAndWidgetTests {
    private let calendar = Calendar(identifier: .gregorian)
    private let now = ISO8601DateFormatter().date(from: "2026-10-04T20:00:00Z")!

    private func log(hoursAgo: Double, minutes: Int) -> ActivityLog {
        ActivityLog(
            id: UUID(), activityID: "breathing", title: "Ten slow breaths", kind: "mindful",
            durationMinutes: minutes, placeName: nil, reflection: nil,
            completedAt: now.addingTimeInterval(-hoursAgo * 3600)
        )
    }

    @Test func weekSummaryCountsOnlyTheLastSevenDays() {
        let summary = WeekSummary(
            logs: [log(hoursAgo: 1, minutes: 20), log(hoursAgo: 2, minutes: 10), log(hoursAgo: 30, minutes: 15), log(hoursAgo: 24 * 8, minutes: 60)],
            endingAt: now,
            calendar: calendar
        )
        #expect(summary.moments == 3)
        #expect(summary.minutes == 45)
        #expect(summary.days == 2)
        #expect(summary.recapText.hasPrefix("2 evenings offline"))
    }

    @Test func emptyWeekGetsAGentleNudge() {
        #expect(WeekSummary(logs: [], endingAt: now, calendar: calendar).recapText.hasPrefix("A quiet week"))
    }

    @Test func widgetShowsTomorrowsPickAfterMidnight() {
        let snapshot = WidgetSnapshot.placeholder
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: snapshot.day)!
        let later = calendar.date(byAdding: .day, value: 2, to: snapshot.day)!
        #expect(snapshot.pick(at: snapshot.day, calendar: calendar) == snapshot.tonight)
        #expect(snapshot.pick(at: tomorrow, calendar: calendar) == snapshot.tomorrow)
        #expect(snapshot.pick(at: later, calendar: calendar) == nil)
    }

    @Test func clippingRespectsDatabaseLength() {
        let text = String(repeating: "👋🏽", count: 50)
        #expect(text.databaseLength == 100)
        let clipped = text.clipped(to: 81)
        #expect(clipped.databaseLength == 80)
        #expect(clipped.count == 40)
    }

    @Test func libraryHasSixtyActivities() {
        #expect(ActivityLibrary.all.count >= 60)
    }
}
