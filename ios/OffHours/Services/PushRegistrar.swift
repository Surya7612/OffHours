import UIKit

/// Holds the APNs device token iOS hands to the app delegate until someone is signed in to
/// attach it to.
@MainActor
final class PushRegistrar {
    static let shared = PushRegistrar()

    private(set) var token: String?
    var onToken: ((String) -> Void)?

    /// Debug builds talk to the APNs sandbox; TestFlight and App Store builds to production.
    static var environment: String {
        #if DEBUG
        "sandbox"
        #else
        "production"
        #endif
    }

    func register() {
        UIApplication.shared.registerForRemoteNotifications()
    }

    func didRegister(deviceToken: Data) {
        let hex = deviceToken.map { String(format: "%02x", $0) }.joined()
        token = hex
        onToken?(hex)
    }
}
