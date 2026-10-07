import EventKit
import Foundation

/// Writes one event into the user's calendar. OffHours never reads existing events.
enum CalendarPlanner {
    enum Outcome: Equatable, Sendable {
        case saved
        case denied
        case failed
    }

    /// The nudge time today when it is still ahead, otherwise right now.
    static func plannedStart(hour: Int, minute: Int, now: Date = .now, calendar: Calendar = .current) -> Date {
        let planned = calendar.date(bySettingHour: hour, minute: minute, second: 0, of: now) ?? now
        return planned > now ? planned : now
    }

    @MainActor
    static func save(title: String, start: Date, minutes: Int, location: String?, notes: String) async -> Outcome {
        let store = EKEventStore()
        do {
            let granted = try await store.requestWriteOnlyAccessToEvents()
            guard granted else { return .denied }
            guard let calendar = store.defaultCalendarForNewEvents else { return .failed }
            let event = EKEvent(eventStore: store)
            event.calendar = calendar
            event.title = title
            event.startDate = start
            event.endDate = start.addingTimeInterval(TimeInterval(max(minutes, 1) * 60))
            event.location = location
            event.notes = notes
            try store.save(event, span: .thisEvent)
            return .saved
        } catch {
            return .failed
        }
    }
}
