import SwiftUI
import UserNotifications

@main
struct OffHoursApp: App {
    @UIApplicationDelegateAdaptor private var appDelegate: AppDelegate
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(appDelegate.model)
                .task { await appDelegate.model.start() }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active {
                        Task { await appDelegate.model.didBecomeActive() }
                    }
                }
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    let model = AppModel()

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        PushRegistrar.shared.didRegister(deviceToken: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: any Error) {
        print("Push registration failed: \(error.localizedDescription)")
    }

    /// Silent part of a push, delivered even when the app is in the background.
    func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any]
    ) async -> UIBackgroundFetchResult {
        let payload = NotificationPayload(userInfo)
        if payload.kind == "cancelled", let id = payload.gatheringID {
            NotificationScheduler.cancelReminder(for: id)
            return .newData
        }
        return .noData
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        let payload = NotificationPayload(notification.request.content.userInfo)
        if payload.kind == "cancelled", let id = payload.gatheringID {
            NotificationScheduler.cancelReminder(for: id)
        }
        return [.banner, .sound]
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let payload = NotificationPayload(response.notification.request.content.userInfo)
        await MainActor.run { model.handleNotificationTap(payload) }
    }
}

/// The parts of a notification's `userInfo` the app acts on.
struct NotificationPayload: Sendable {
    var gatheringID: UUID?
    var kind: String?
    var open: String?

    init(_ userInfo: [AnyHashable: Any]) {
        gatheringID = (userInfo["gathering_id"] as? String).flatMap(UUID.init(uuidString:))
        kind = userInfo["kind"] as? String
        open = userInfo["open"] as? String
    }
}
