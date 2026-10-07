import CoreLocation
import Foundation
import OSLog
import WeatherKit

/// Tonight's conditions. Sunset always works offline; weather comes from Apple Weather and is
/// skipped if it's unavailable.
@MainActor
enum WeatherProvider {
    struct Attribution: Equatable, Sendable {
        var lightMark: URL
        var darkMark: URL
        var legalPage: URL
    }

    private struct Cached {
        let location: CLLocation
        let fetchedAt: Date
        let conditions: EveningConditions
        let attribution: Attribution
    }

    private static var cached: Cached?
    private static let log = Logger(subsystem: "com.suryanediyadeth.offhours", category: "weather")
    /// Why the last lookup failed, so Settings can show it. Nil after a success.
    private(set) static var lastProblem: String?

    static let legalPage = URL(string: "https://weatherkit.apple.com/legal-attribution.html")!

    /// Whole degrees in the person's temperature unit. The default measurement style keeps the raw precision.
    nonisolated static func temperatureLabel(_ temperature: Measurement<UnitTemperature>) -> String {
        temperature.formatted(.measurement(
            width: .narrow,
            usage: .weather,
            numberFormatStyle: .number.precision(.fractionLength(0))
        ))
    }

    static func conditions(at location: CLLocation, now: Date = .now, fresh: Bool = false) async -> (EveningConditions, Attribution?) {
        let sunset = SunCalculator.sunset(
            on: now,
            latitude: location.coordinate.latitude,
            longitude: location.coordinate.longitude
        )
        if !fresh, let cached, now.timeIntervalSince(cached.fetchedAt) < 30 * 60,
           cached.location.distance(from: location) < 2_000 {
            var conditions = cached.conditions
            conditions.sunset = sunset
            return (conditions, cached.attribution)
        }
        var conditions = EveningConditions(sunset: sunset)

        let service = WeatherService.shared
        let current: CurrentWeather
        do {
            current = try await service.weather(for: location, including: .current)
        } catch {
            log.error("Weather unavailable: \(error.localizedDescription, privacy: .public)")
            lastProblem = error.localizedDescription
            return (conditions, nil)
        }

        let hourly = try? await service.weather(
            for: location,
            including: .hourly(startDate: now, endDate: now.addingTimeInterval(3 * 3600))
        )
        let wetSoon = hourly?.forecast.contains { $0.precipitationChance >= 0.5 } ?? false
        let celsius = current.temperature.converted(to: .celsius).value
        conditions.weather = if current.condition.isWet || wetSoon {
            .wet
        } else if celsius < 2 {
            .tooCold
        } else if celsius > 33 {
            .tooHot
        } else {
            .clear
        }
        conditions.summary = "\(temperatureLabel(current.temperature)) · \(current.condition.description)"
        conditions.symbol = current.symbolName
        lastProblem = nil

        guard let mark = try? await service.attribution else { return (conditions, nil) }
        let attribution = Attribution(
            lightMark: mark.combinedMarkLightURL,
            darkMark: mark.combinedMarkDarkURL,
            legalPage: mark.legalPageURL
        )
        cached = Cached(location: location, fetchedAt: now, conditions: conditions, attribution: attribution)
        return (conditions, attribution)
    }
}

private extension WeatherCondition {
    var isWet: Bool {
        switch self {
        case .drizzle, .rain, .heavyRain, .sunShowers, .isolatedThunderstorms, .scatteredThunderstorms,
             .strongStorms, .thunderstorms, .freezingDrizzle, .freezingRain, .sleet, .hail, .snow, .heavySnow,
             .flurries, .sunFlurries, .blizzard, .blowingSnow, .wintryMix, .hurricane, .tropicalStorm:
            true
        default:
            false
        }
    }
}
