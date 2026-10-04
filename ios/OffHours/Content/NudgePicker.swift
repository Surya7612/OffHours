import Foundation

/// Picks the day's activity. Picks are deterministic for a given person, day and set of
/// interests, so a notification scheduled days ahead matches what the app shows that evening.
enum NudgePicker {
    static func ranked(
        for day: Date,
        profile: Profile,
        library: [Activity] = ActivityLibrary.all,
        calendar: Calendar = .current
    ) -> [Activity] {
        let time = Activity.TimeOfDay(hour: profile.nudgeHour)
        let interests = Set(profile.interests.compactMap(Interest.init(rawValue:)))
        var rng = SeededGenerator(seed: seed(for: day, userID: profile.id, calendar: calendar))

        let candidates = library.filter { $0.times.contains(time) }
        let pool = candidates.isEmpty ? library : candidates

        return pool
            .map { activity -> (Activity, Double) in
                // Extra matches count for less, so a few many-interest activities don't win every day.
                let matches = activity.interests.intersection(interests).count
                var score = matches > 0 ? 10 + Double(matches - 1) * 3 : 0
                if activity.minutes <= 30 { score += 3 }
                score += Double.random(in: 0..<14, using: &rng)
                return (activity, score)
            }
            .sorted { $0.1 > $1.1 }
            .map(\.0)
    }

    static func pick(for day: Date, profile: Profile) -> Activity {
        ranked(for: day, profile: profile).first ?? ActivityLibrary.all[0]
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
