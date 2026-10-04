import UIKit

/// Holds the APNs device token iOS hands to the app delegate until someone is signed in to
/// attach it to. The last token is kept across launches so signing out can always detach it.
@MainActor
final class PushRegistrar {
    static let shared = PushRegistrar()
    private static let tokenKey = "lastPushToken"

    private(set) var token: String? = UserDefaults.standard.string(forKey: tokenKey)
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

    /// Stops pushes for the previous account on this device, even if the server call failed.
    func unregister() {
        UIApplication.shared.unregisterForRemoteNotifications()
        token = nil
        UserDefaults.standard.removeObject(forKey: Self.tokenKey)
    }

    func didRegister(deviceToken: Data) {
        let hex = deviceToken.map { String(format: "%02x", $0) }.joined()
        token = hex
        UserDefaults.standard.set(hex, forKey: Self.tokenKey)
        onToken?(hex)
    }
}
