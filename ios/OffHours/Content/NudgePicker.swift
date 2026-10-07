import Foundation

/// Picks the day's activity. Picks are deterministic for a given person, day and set of
/// interests, so a notification scheduled days ahead matches what the app shows that evening.
enum NudgePicker {
    static func ranked(
        for day: Date,
        profile: Profile,
        library: [Activity] = ActivityLibrary.all,
        intent: TonightIntent? = nil,
        feedback: ActivityFeedback = ActivityFeedback(),
        preferences: EveningPreferences = EveningPreferences(),
        history: [ActivityLog] = [],
        calendar: Calendar = .current
    ) -> [Activity] {
        let time = Activity.TimeOfDay(hour: profile.nudgeHour)
        let interests = Set(profile.interests.compactMap(Interest.init(rawValue:)))
        var rng = SeededGenerator(seed: seed(for: day, userID: profile.id, calendar: calendar))
        let recent = history.filter { day.timeIntervalSince($0.completedAt) < 90 * 86_400 }
        let completedByID = Dictionary(grouping: recent, by: \.activityID).mapValues(\.count)
        let completedByKind = Dictionary(grouping: recent, by: \.kind).mapValues(\.count)

        let candidates = library.filter { $0.times.contains(time) }
        let pool = candidates.isEmpty ? library : candidates

        return pool
            .map { activity -> (Activity, Double) in
                // Extra matches count for less, so a few many-interest activities don't win every day.
                let matches = activity.interests.intersection(interests).count
                var score = matches > 0 ? 10 + Double(matches - 1) * 3 : 0
                if activity.minutes <= 30 { score += 3 }
                if let intent { score += intentScore(activity, intent: intent) }

                // A completion is a quiet positive signal; a skip is stronger but never removes
                // an activity forever. This preserves variety instead of creating a filter bubble.
                score += Double(min(completedByID[activity.id] ?? 0, 3)) * 5
                score += Double(min(completedByKind[activity.kind.rawValue] ?? 0, 6))
                score += Double(min(feedback.likeCount(for: activity.kind.rawValue), 4)) * 4
                score -= Double(feedback.skipCount(for: activity.id)) * 5
                score -= feedbackPenalty(activity, feedback: feedback)
                score -= preferencePenalty(activity, preferences: preferences)
                score += Double.random(in: 0..<14, using: &rng)
                return (activity, score)
            }
            .sorted { $0.1 > $1.1 }
            .map(\.0)
    }

    static func pick(for day: Date, profile: Profile) -> Activity {
        ranked(for: day, profile: profile).first ?? ActivityLibrary.all[0]
    }

    private static func intentScore(_ activity: Activity, intent: TonightIntent) -> Double {
        var score = 0.0

        if activity.minutes <= intent.time.maximumMinutes {
            score += 18
        } else {
            score -= Double(min(activity.minutes - intent.time.maximumMinutes, 45)) * 0.7
        }

        let energyOrder: [TonightIntent.Energy] = [.low, .steady, .active]
        let activityEnergy = energyOrder.firstIndex(of: activity.energy) ?? 1
        let wantedEnergy = energyOrder.firstIndex(of: intent.energy) ?? 1
        score += activityEnergy == wantedEnergy ? 12 : (abs(activityEnergy - wantedEnergy) == 1 ? 3 : -8)

        if intent.budget == .free {
            score += activity.mayCostMoney ? -20 : 4
        }

        switch intent.company {
        case .solo:
            score += activity.isSocial ? -14 : 10
        case .social:
            score += activity.isSocial ? 16 : -8
        case .either:
            break
        }
        return score
    }

    /// Reasons describe a kind of plan, so they affect similar activities rather than only the one skipped.
    private static func feedbackPenalty(_ activity: Activity, feedback: ActivityFeedback) -> Double {
        var penalty = 0.0
        if activity.place != nil { penalty += Double(feedback.reasonCount(.tooFar)) * 4 }
        if activity.mayCostMoney { penalty += Double(feedback.reasonCount(.costsMoney)) * 6 }
        if activity.energy == .active { penalty += Double(feedback.reasonCount(.tooMuchEnergy)) * 5 }
        if activity.isOutdoor { penalty += Double(feedback.reasonCount(.weather)) * 5 }
        return penalty
    }

    /// Lasting preferences are stronger than one skip, and still weaker than a strong interest match plus variety.
    private static func preferencePenalty(_ activity: Activity, preferences: EveningPreferences) -> Double {
        var penalty = 0.0
        if preferences.quieter, activity.isSocial { penalty += 18 }
        if preferences.stayClose, activity.place != nil { penalty += 18 }
        if preferences.preferIndoor, activity.isOutdoor { penalty += 20 }
        if preferences.keepFree, activity.mayCostMoney { penalty += 22 }
        return penalty
    }

    private static func seed(for day: Date, userID: UUID, calendar: Calendar) -> UInt64 {
        let parts = calendar.dateComponents([.year, .month, .day], from: day)
        let text = "\(userID.uuidString)-\(parts.year ?? 0)-\(parts.month ?? 0)-\(parts.day ?? 0)"
        var hash: UInt64 = 0xcbf29ce484222325
        for byte in text.utf8 {
            hash ^= UInt64(byte)
            hash &*= 0x100000001b3
        }
        return hash
    }
}

struct SeededGenerator: RandomNumberGenerator {
    private var state: UInt64

    init(seed: UInt64) { state = seed }

    mutating func next() -> UInt64 {
        state &+= 0x9e3779b97f4a7c15
        var z = state
        z = (z ^ (z >> 30)) &* 0xbf58476d1ce4e5b9
        z = (z ^ (z >> 27)) &* 0x94d049bb133111eb
        return z ^ (z >> 31)
    }
}
