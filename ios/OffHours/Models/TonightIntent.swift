import Foundation

/// A quick description of what fits right now. It stays on this device and expires at midnight.
struct TonightIntent: Codable, Equatable, Sendable {
    enum Time: Int, CaseIterable, Codable, Identifiable, Sendable {
        case quick = 15
        case halfHour = 30
        case fullHour = 60

        var id: Int { rawValue }
        var label: String { self == .fullHour ? "60+ min" : "\(rawValue) min" }
        var maximumMinutes: Int { self == .fullHour ? 120 : rawValue }
    }

    enum Energy: String, CaseIterable, Codable, Identifiable, Sendable {
        case low
        case steady
        case active

        var id: String { rawValue }
        var label: String {
            switch self {
            case .low: "Low"
            case .steady: "Steady"
            case .active: "Active"
            }
        }
        var symbol: String {
            switch self {
            case .low: "battery.25percent"
            case .steady: "battery.75percent"
            case .active: "bolt.fill"
            }
        }
    }

    enum Budget: String, CaseIterable, Codable, Identifiable, Sendable {
        case free
        case flexible

        var id: String { rawValue }
        var label: String { self == .free ? "Free" : "Can spend" }
    }

    enum Company: String, CaseIterable, Codable, Identifiable, Sendable {
        case solo
        case social
        case either

        var id: String { rawValue }
        var label: String {
            switch self {
            case .solo: "Solo"
            case .social: "With people"
            case .either: "Either"
            }
        }
    }

    var time: Time = .halfHour
    var energy: Energy = .steady
    var budget: Budget = .free
    var company: Company = .either

    var summary: String {
        "\(time.label) · \(energy.label.lowercased()) energy · \(budget.label.lowercased()) · \(company.label.lowercased())"
    }
}

struct ActivityFeedback: Codable, Equatable, Sendable {
    private(set) var skips: [String: Int] = [:]

    mutating func skipped(_ activityID: String) {
        skips[activityID] = min((skips[activityID] ?? 0) + 1, 10)
    }

    func skipCount(for activityID: String) -> Int { skips[activityID] ?? 0 }
}

/// Local-only check-in and preference memory. Keys are scoped to the account on this device.
enum TonightPersonalizationStore {
    private struct DailyIntent: Codable {
        var day: Date
        var intent: TonightIntent
    }

    private static func intentKey(_ userID: UUID) -> String { "tonight-intent-\(userID.uuidString)" }
    private static func feedbackKey(_ userID: UUID) -> String { "activity-feedback-\(userID.uuidString)" }

    static func intent(for userID: UUID, on date: Date = .now, calendar: Calendar = .current) -> TonightIntent? {
        guard let data = UserDefaults.standard.data(forKey: intentKey(userID)),
              let saved = try? JSONDecoder().decode(DailyIntent.self, from: data),
              calendar.isDate(saved.day, inSameDayAs: date)
        else { return nil }
        return saved.intent
    }

    static func save(_ intent: TonightIntent, for userID: UUID, on date: Date = .now) {
        let saved = DailyIntent(day: date, intent: intent)
        guard let data = try? JSONEncoder().encode(saved) else { return }
        UserDefaults.standard.set(data, forKey: intentKey(userID))
    }

    static func feedback(for userID: UUID) -> ActivityFeedback {
        guard let data = UserDefaults.standard.data(forKey: feedbackKey(userID)),
              let feedback = try? JSONDecoder().decode(ActivityFeedback.self, from: data)
        else { return ActivityFeedback() }
        return feedback
    }

    static func recordSkip(activityID: String, for userID: UUID) {
        var feedback = feedback(for: userID)
        feedback.skipped(activityID)
        guard let data = try? JSONEncoder().encode(feedback) else { return }
        UserDefaults.standard.set(data, forKey: feedbackKey(userID))
    }

    static func clear(userID: UUID) {
        UserDefaults.standard.removeObject(forKey: intentKey(userID))
        UserDefaults.standard.removeObject(forKey: feedbackKey(userID))
    }
}

extension Activity {
    /// Broad traits keep the library maintainable: new activities get sensible behavior without
    /// four extra fields on every catalog entry.
    var energy: TonightIntent.Energy {
        switch kind {
        case .mindful, .creative: .low
        case .nature, .social, .community: .steady
        case .movement: .active
        }
    }

    var isSocial: Bool { kind == .social || kind == .community }

    /// Cafés and museums are the only catalog places that normally require a purchase or ticket.
    var mayCostMoney: Bool { place == .cafe || place == .museum }
}
