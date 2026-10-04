import CoreLocation
import Foundation
import WeatherKit

/// Tonight's conditions. Sunset always works offline; weather comes from Apple Weather and is
/// skipped quietly if it's unavailable.
enum WeatherProvider {
    struct Attribution: Equatable, Sendable {
        var lightMark: URL
        var darkMark: URL
        var legalPage: URL
    }

    static func conditions(at location: CLLocation, now: Date = .now) async -> (EveningConditions, Attribution?) {
        let sunset = SunCalculator.sunset(
            on: now,
            latitude: location.coordinate.latitude,
            longitude: location.coordinate.longitude
        )
        var conditions = EveningConditions(sunset: sunset)

        do {
            let service = WeatherService.shared
            let (current, hourly) = try await service.weather(for: location, including: .current, .hourly)
            let nextHours = hourly.forecast.filter { $0.date > now && $0.date < now.addingTimeInterval(3 * 3600) }
            let celsius = current.temperature.converted(to: .celsius).value
            let wetSoon = nextHours.contains { $0.precipitationChance >= 0.5 }
            conditions.weather = if current.condition.isWet || wetSoon {
                .wet
            } else if celsius < 2 {
                .tooCold
            } else if celsius > 33 {
                .tooHot
            } else {
                .clear
            }
            let temperature = current.temperature.formatted(.measurement(width: .narrow, usage: .weather, numberFormatStyle: .number.precision(.fractionLength(0))))
            conditions.summary = "\(temperature) · \(current.condition.description)"
            conditions.symbol = current.symbolName

            let attribution = try await service.attribution
            return (conditions, Attribution(
                lightMark: attribution.combinedMarkLightURL,
                darkMark: attribution.combinedMarkDarkURL,
                legalPage: attribution.legalPageURL
            ))
        } catch {
            return (conditions, nil)
        }
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
