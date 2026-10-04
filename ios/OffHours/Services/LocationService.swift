import CoreLocation
import Observation

@MainActor
@Observable
final class LocationService: NSObject {
    /// Filled in by the delegate callback that CoreLocation sends right after the manager is
    /// created; reading `authorizationStatus` synchronously on the main thread can stall launch.
    private(set) var authorization: CLAuthorizationStatus = .notDetermined
    private(set) var lastLocation: CLLocation?

    private let manager = CLLocationManager()
    private var hasInitialStatus = false
    private var initialStatusWaiters: [CheckedContinuation<Void, Never>] = []
    private var authorizationWaiters: [CheckedContinuation<CLAuthorizationStatus, Never>] = []
    private var locationWaiters: [CheckedContinuation<CLLocation?, Never>] = []

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    var isAuthorized: Bool {
        authorization == .authorizedWhenInUse || authorization == .authorizedAlways
    }

    var isDenied: Bool {
        authorization == .denied || authorization == .restricted
    }

    private func waitForInitialStatus() async {
        guard !hasInitialStatus else { return }
        await withCheckedContinuation { initialStatusWaiters.append($0) }
    }

    @discardableResult
    func requestPermission() async -> CLAuthorizationStatus {
        await waitForInitialStatus()
        guard authorization == .notDetermined else { return authorization }
        return await withCheckedContinuation { continuation in
            authorizationWaiters.append(continuation)
            manager.requestWhenInUseAuthorization()
        }
    }

    /// A recent location, or nil when permission is missing or the fix fails.
    func currentLocation(maxAge: TimeInterval = 300) async -> CLLocation? {
        if let lastLocation, -lastLocation.timestamp.timeIntervalSinceNow < maxAge {
            return lastLocation
        }
        await waitForInitialStatus()
        if authorization == .notDetermined {
            await requestPermission()
        }
        guard isAuthorized else { return nil }
        return await withCheckedContinuation { continuation in
            locationWaiters.append(continuation)
            if locationWaiters.count == 1 {
                manager.requestLocation()
            }
        }
    }

    private func finishLocationRequests(with location: CLLocation?) {
        if let location { lastLocation = location }
        let waiters = locationWaiters
        locationWaiters.removeAll()
        waiters.forEach { $0.resume(returning: location ?? lastLocation) }
    }
}

extension LocationService: CLLocationManagerDelegate {
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in
            self.authorization = status
            if !self.hasInitialStatus {
                self.hasInitialStatus = true
                let waiters = self.initialStatusWaiters
                self.initialStatusWaiters.removeAll()
                waiters.forEach { $0.resume() }
            }
            guard status != .notDetermined else { return }
            let waiters = self.authorizationWaiters
            self.authorizationWaiters.removeAll()
            waiters.forEach { $0.resume(returning: status) }
            if !self.isAuthorized {
                self.finishLocationRequests(with: nil)
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        let location = locations.last
        Task { @MainActor in self.finishLocationRequests(with: location) }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: any Error) {
        Task { @MainActor in self.finishLocationRequests(with: nil) }
    }
}
