import Foundation
import UserNotifications

/// Local notifications only; no push server is needed for the daily nudge or gathering reminders.
enum NotificationScheduler {
    private static let dailyPrefix = "daily-nudge-"
    private static let gatheringPrefix = "gathering-"
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

    static func scheduleReminder(for gathering: Gathering, now: Date = .now) async {
        guard await isAuthorized() else { return }
        let fireDate = gathering.startsAt.addingTimeInterval(-60 * 60)
        guard fireDate > now else { return }

        let content = UNMutableNotificationContent()
        content.title = "\(gathering.title) in an hour"
        content.body = "At \(gathering.placeName). Leave your phone in your pocket once you arrive."
        content.sound = .default
        content.threadIdentifier = "gatherings"

        let components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: fireDate)
        let request = UNNotificationRequest(
            identifier: gatheringPrefix + gathering.id.uuidString,
            content: content,
            trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        )
        try? await UNUserNotificationCenter.current().add(request)
    }

    static func cancelReminder(for gatheringID: UUID) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [gatheringPrefix + gatheringID.uuidString])
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
