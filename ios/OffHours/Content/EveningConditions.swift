import Foundation

/// What it's like outside tonight, used to keep outdoor picks for good evenings.
struct EveningConditions: Equatable, Sendable {
    enum Weather: Equatable, Sendable {
        case clear
        case wet       // rain, snow, storms, or likely in the next few hours
        case tooCold   // below about 2°C
        case tooHot    // above about 33°C
    }

    var weather: Weather?
    var sunset: Date?
    /// "18° · Light rain", for the Tonight header. Nil without weather data.
    var summary: String?
    var symbol: String?

    var keepsPeopleIndoors: Bool { weather != nil && weather != .clear }

    func isDark(at date: Date) -> Bool {
        guard let sunset else { return false }
        return date > sunset.addingTimeInterval(30 * 60)
    }

    /// Why an outdoor pick was swapped for an indoor one, in plain words.
    func indoorReason(at date: Date) -> String? {
        switch weather {
        case .wet: return "It looks wet out tonight, so here's something indoors."
        case .tooCold: return "It's very cold out tonight, so here's something indoors."
        case .tooHot: return "It's very hot out tonight, so here's something indoors."
        case .clear, nil: return isDark(at: date) ? "It's dark out, so here's something cozier." : nil
        }
    }

    /// "Sunset is at 7:12 PM. Head out by 6:47." for outdoor picks on the way to sunset.
    func sunsetHint(for activity: Activity, at date: Date) -> String? {
        guard activity.isOutdoor, let sunset, sunset > date, sunset.timeIntervalSince(date) < 4 * 3600 else { return nil }
        let leaveBy = sunset.addingTimeInterval(-TimeInterval(activity.minutes * 60))
        let sunsetText = sunset.formatted(date: .omitted, time: .shortened)
        guard leaveBy > date else { return "Sunset is at \(sunsetText). Go now to catch the light." }
        return "Sunset is at \(sunsetText). Head out by \(leaveBy.formatted(date: .omitted, time: .shortened))."
    }
}

extension Activity {
    /// Activities that only make sense outside.
    var isOutdoor: Bool {
        place == .park || place == .waterfront || kind == .nature
    }

    /// Outdoor activities meant for daylight; ones suggested at night (like stargazing) are fine after dark.
    var needsDaylight: Bool { isOutdoor && !times.contains(.night) }
}

extension NudgePicker {
    /// Tonight's order: the usual ranking, with outdoor activities moved to the end when the
    /// weather or darkness makes them a poor choice.
    static func tonight(
        for date: Date,
        profile: Profile,
        conditions: EveningConditions?,
        library: [Activity] = ActivityLibrary.all,
        intent: TonightIntent? = nil,
        feedback: ActivityFeedback = ActivityFeedback(),
        history: [ActivityLog] = []
    ) -> (ranked: [Activity], reason: String?) {
        let base = ranked(
            for: date,
            profile: profile,
            library: library,
            intent: intent,
            feedback: feedback,
            history: history
        )
        guard let conditions else { return (base, nil) }
        let isPoorFit: (Activity) -> Bool = if conditions.keepsPeopleIndoors {
            \.isOutdoor
        } else if conditions.isDark(at: date) {
            \.needsDaylight
        } else {
            { _ in false }
        }
        let good = base.filter { !isPoorFit($0) }
        guard !good.isEmpty, good.count < base.count else { return (base, nil) }
        let adjusted = good + base.filter(isPoorFit)
        let reason = base.first.map(isPoorFit) == true ? conditions.indoorReason(at: date) : nil
        return (adjusted, reason)
    }
}
