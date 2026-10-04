import SwiftUI
import WidgetKit

@main
struct OffHoursWidgetsBundle: WidgetBundle {
    var body: some Widget {
        TonightWidget()
        SessionLiveActivity()
    }
}

/// The app's colors; the widget extension can't see the app's Theme.
enum WidgetTheme {
    static let ember = Color(red: 0.89, green: 0.45, blue: 0.29)
    static let dusk = Color(red: 0.24, green: 0.20, blue: 0.42)
    static let twilight = Color(red: 0.55, green: 0.33, blue: 0.53)
    static let gradient = LinearGradient(colors: [dusk, twilight, ember], startPoint: .topLeading, endPoint: .bottomTrailing)
}
