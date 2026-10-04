import CoreLocation
import MapKit

struct Place: Identifiable, Hashable, Sendable {
    var id: String { "\(name)-\(coordinate.latitude)-\(coordinate.longitude)" }
    let name: String
    let address: String
    let coordinate: CLLocationCoordinate2D
    var distanceMeters: Double?

    static func == (lhs: Place, rhs: Place) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }

    @MainActor
    var mapItem: MKMapItem {
        let item = MKMapItem(placemark: MKPlacemark(coordinate: coordinate))
        item.name = name
        return item
    }

    @MainActor
    func openInMaps() {
        mapItem.openInMaps(launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeWalking])
    }
}

/// Real places from Apple Maps. No API key or cost; requests are made on device.
@MainActor
enum PlaceFinder {
    static func nearest(_ kind: Activity.PlaceKind, around location: CLLocation, withinKm radiusKm: Int) async -> [Place] {
        let request = MKLocalPointsOfInterestRequest(
            center: location.coordinate,
            radius: CLLocationDistance(min(radiusKm, 10) * 1000)
        )
        request.pointOfInterestFilter = MKPointOfInterestFilter(including: kind.categories)
        do {
            let response = try await MKLocalSearch(request: request).start()
            return response.mapItems
                .map { place(from: $0, relativeTo: location) }
                .sorted { ($0.distanceMeters ?? .infinity) < ($1.distanceMeters ?? .infinity) }
        } catch {
            return []
        }
    }

    static func search(_ query: String, near location: CLLocation?) async throws -> [Place] {
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = query
        request.resultTypes = [.pointOfInterest, .address]
        if let location {
            request.region = MKCoordinateRegion(center: location.coordinate, latitudinalMeters: 20_000, longitudinalMeters: 20_000)
        }
        let response = try await MKLocalSearch(request: request).start()
        return response.mapItems.map { place(from: $0, relativeTo: location) }
    }

    private static func place(from item: MKMapItem, relativeTo location: CLLocation?) -> Place {
        let placemark = item.placemark
        let coordinate = placemark.coordinate
        let street = [placemark.subThoroughfare, placemark.thoroughfare].compactMap { $0 }.joined(separator: " ")
        let address = [street, placemark.locality ?? ""].filter { !$0.isEmpty }.joined(separator: ", ")
        let distance = location.map { CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude).distance(from: $0) }
        return Place(
            name: item.name ?? placemark.name ?? "Unnamed place",
            address: address,
            coordinate: coordinate,
            distanceMeters: distance
        )
    }
}

extension Double {
    /// Walking-friendly distance text, e.g. "350 m" or "1.4 km", following the user's locale.
    var formattedDistance: String {
        let measurement = Measurement(value: self, unit: UnitLength.meters)
        return measurement.formatted(.measurement(width: .abbreviated, usage: .road, numberFormatStyle: .number.precision(.fractionLength(0...1))))
    }
}
