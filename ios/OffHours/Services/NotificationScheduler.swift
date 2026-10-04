import Foundation
import UserNotifications

/// Local notifications only; no push server is needed for the daily nudge or gathering reminders.
enum NotificationScheduler {
    private static let dailyPrefix = "daily-nudge-"
    private static let gatheringPrefix = "gathering-"
    private static let followUpPrefix = "followup-"
    private static let recapID = "weekly-recap"
    private static let daysAhead = 14

    static func requestPermission() async -> Bool {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            return true
        case .denied:
            return false
        default:
            return (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        }
    }

    static func isAuthorized() async -> Bool {
        let status = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
        return status == .authorized || status == .provisional || status == .ephemeral
    }

    /// Schedules one notification per day for the next two weeks, each naming that day's
    /// activity. Re-run whenever the app becomes active or the profile changes.
    static func scheduleDailyNudges(for profile: Profile, skipToday: Bool, now: Date = .now, calendar: Calendar = .current) async {
        let center = UNUserNotificationCenter.current()
        let pending = await center.pendingNotificationRequests()
        center.removePendingNotificationRequests(withIdentifiers: pending.map(\.identifier).filter { $0.hasPrefix(dailyPrefix) })

        guard await isAuthorized() else { return }

        let today = calendar.startOfDay(for: now)
        for offset in 0..<daysAhead {
            guard !Task.isCancelled else { return }
            guard let day = calendar.date(byAdding: .day, value: offset, to: today),
                  let fireDate = calendar.date(bySettingHour: profile.nudgeHour, minute: profile.nudgeMinute, second: 0, of: day),
                  fireDate > now
            else { continue }
            if offset == 0 && skipToday { continue }

            let activity = NudgePicker.pick(for: day, profile: profile)
            let content = UNMutableNotificationContent()
            content.title = "Your OffHours moment"
            content.body = "\(activity.title), \(activity.minutes) min. \(activity.summary)"
            content.sound = .default
            content.threadIdentifier = "daily-nudge"

            var components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: fireDate)
            components.second = 0
            let request = UNNotificationRequest(
                identifier: dailyPrefix + dayKey(day),
                content: content,
                trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
            )
            try? await center.add(request)
        }
    }

    static func cancelToday(now: Date = .now) {
        let id = dailyPrefix + dayKey(now)
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
    }

    /// An hour-before reminder, plus a "How was it?" nudge after it ends to log it in the journal.
    /// Both fire at a fixed moment, so they stay right if the person changes time zones.
    static func scheduleReminder(for gathering: Gathering, now: Date = .now) async {
        guard await isAuthorized() else { return }
        let center = UNUserNotificationCenter.current()

        let reminderDate = gathering.startsAt.addingTimeInterval(-60 * 60)
        if reminderDate > now {
            let content = UNMutableNotificationContent()
            content.title = "\(gathering.title) in an hour"
            content.body = if let spot = gathering.meetingSpot {
                "At \(gathering.placeName): \(spot)"
            } else {
                "At \(gathering.placeName). Leave your phone in your pocket once you arrive."
            }
            content.sound = .default
            content.threadIdentifier = "gatherings"
            content.userInfo = ["gathering_id": gathering.id.uuidString]
            try? await center.add(UNNotificationRequest(
                identifier: gatheringPrefix + gathering.id.uuidString,
                content: content,
                trigger: UNTimeIntervalNotificationTrigger(timeInterval: reminderDate.timeIntervalSince(now), repeats: false)
            ))
        }

        let followUpDate = gathering.endsAt.addingTimeInterval(15 * 60)
        if followUpDate > now {
            let content = UNMutableNotificationContent()
            content.title = "How was \(gathering.title)?"
            content.body = "Add it to your journal. It counts toward your streak."
            content.threadIdentifier = "gatherings"
            content.userInfo = ["open": "tonight"]
            try? await center.add(UNNotificationRequest(
                identifier: followUpPrefix + gathering.id.uuidString,
                content: content,
                trigger: UNTimeIntervalNotificationTrigger(timeInterval: followUpDate.timeIntervalSince(now), repeats: false)
            ))
        }
    }

    static func cancelReminder(for gatheringID: UUID) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [
            gatheringPrefix + gatheringID.uuidString,
            followUpPrefix + gatheringID.uuidString,
        ])
    }

    static func cancelGatheringFollowUp(for gatheringID: UUID) {
        let id = followUpPrefix + gatheringID.uuidString
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [id])
        center.removeDeliveredNotifications(withIdentifiers: [id])
    }

    /// Makes pending reminders match the gatherings someone is still going to, so cancelled or
    /// moderated gatherings stop reminding them and changed times or meeting spots are picked up.
    static func syncReminders(with upcoming: [Gathering], now: Date = .now) async {
        let center = UNUserNotificationCenter.current()
        let upcomingIDs = Set(upcoming.map(\.id.uuidString))
        var stale: [String] = []
        for request in await center.pendingNotificationRequests() {
            let id = request.identifier
            if id.hasPrefix(gatheringPrefix), !upcomingIDs.contains(String(id.dropFirst(gatheringPrefix.count))) {
                stale.append(id)
            } else if id.hasPrefix(followUpPrefix), !upcomingIDs.contains(String(id.dropFirst(followUpPrefix.count))) {
                // A gathering that just ended is no longer upcoming but should still get its follow-up.
                let fireDate = (request.trigger as? UNTimeIntervalNotificationTrigger)?.nextTriggerDate()
                if fireDate.map({ $0.timeIntervalSince(now) > 20 * 60 }) ?? true {
                    stale.append(id)
                }
            }
        }
        center.removePendingNotificationRequests(withIdentifiers: stale)
        for gathering in upcoming {
            await scheduleReminder(for: gathering, now: now)
        }
    }

    /// Sunday evening: how the last seven days went. Rescheduled whenever the journal changes,
    /// so the numbers are current when it fires.
    static func scheduleWeeklyRecap(logs: [ActivityLog], now: Date = .now, calendar: Calendar = .current) async {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [recapID])
        guard await isAuthorized(),
              let fireDate = calendar.nextDate(
                after: now,
                matching: DateComponents(hour: 19, minute: 0, weekday: 1),
                matchingPolicy: .nextTime
              )
        else { return }

        let week = WeekSummary(logs: logs, endingAt: fireDate, calendar: calendar)
        let content = UNMutableNotificationContent()
        content.title = "Your week offline"
        content.body = week.recapText
        content.threadIdentifier = "weekly-recap"
        content.userInfo = ["open": "journal"]
        try? await center.add(UNNotificationRequest(
            identifier: recapID,
            content: content,
            trigger: UNCalendarNotificationTrigger(
                dateMatching: calendar.dateComponents([.year, .month, .day, .hour, .minute], from: fireDate),
                repeats: false
            )
        ))
    }

    static func removeAll() {
        let center = UNUserNotificationCenter.current()
        center.removeAllPendingNotificationRequests()
        center.removeAllDeliveredNotifications()
    }

    private static func dayKey(_ day: Date, calendar: Calendar = .current) -> String {
        let parts = calendar.dateComponents([.year, .month, .day], from: day)
        return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
    }
}
