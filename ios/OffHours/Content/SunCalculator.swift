import Foundation

/// Sunset time from latitude and longitude, computed on the device (accurate to a few minutes).
enum SunCalculator {
    /// Nil where the sun doesn't set that day (polar summer or winter).
    static func sunset(on day: Date, latitude: Double, longitude: Double, calendar: Calendar = .current) -> Date? {
        guard let dayOfYear = calendar.ordinality(of: .day, in: .year, for: day),
              let localNoon = calendar.date(bySettingHour: 12, minute: 0, second: 0, of: day)
        else { return nil }

        let lngHour = longitude / 15
        let t = Double(dayOfYear) + (18 - lngHour) / 24
        let meanAnomaly = 0.9856 * t - 3.289
        let trueLongitude = normalized(
            meanAnomaly + 1.916 * sin(radians(meanAnomaly)) + 0.020 * sin(radians(2 * meanAnomaly)) + 282.634,
            to: 360
        )

        var rightAscension = normalized(degrees(atan(0.91764 * tan(radians(trueLongitude)))), to: 360)
        rightAscension += floor(trueLongitude / 90) * 90 - floor(rightAscension / 90) * 90
        rightAscension /= 15

        let sinDeclination = 0.39782 * sin(radians(trueLongitude))
        let cosDeclination = cos(asin(sinDeclination))
        let zenith = 90.833
        let cosHourAngle = (cos(radians(zenith)) - sinDeclination * sin(radians(latitude)))
            / (cosDeclination * cos(radians(latitude)))
        guard (-1...1).contains(cosHourAngle) else { return nil }

        let hourAngle = degrees(acos(cosHourAngle)) / 15
        let localMeanTime = hourAngle + rightAscension - 0.06571 * t - 6.622
        let utcHours = normalized(localMeanTime - lngHour, to: 24)

        var utc = Calendar(identifier: .gregorian)
        utc.timeZone = TimeZone(identifier: "UTC")!
        let parts = calendar.dateComponents([.year, .month, .day], from: day)
        guard let utcMidnight = utc.date(from: parts) else { return nil }
        var sunset = utcMidnight.addingTimeInterval(utcHours * 3600)

        // The UTC day can differ from the local one; pick the sunset closest to that local afternoon.
        while sunset < localNoon.addingTimeInterval(-6 * 3600) { sunset.addTimeInterval(24 * 3600) }
        while sunset > localNoon.addingTimeInterval(18 * 3600) { sunset.addTimeInterval(-24 * 3600) }
        return sunset
    }

    private static func radians(_ degrees: Double) -> Double { degrees * .pi / 180 }
    private static func degrees(_ radians: Double) -> Double { radians * 180 / .pi }
    private static func normalized(_ value: Double, to range: Double) -> Double {
        let remainder = value.truncatingRemainder(dividingBy: range)
        return remainder < 0 ? remainder + range : remainder
    }
}
