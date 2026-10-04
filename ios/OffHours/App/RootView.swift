import SwiftUI

struct RootView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        Group {
            switch model.phase {
            case .launching:
                LaunchView()
            case .notConfigured:
                NotConfiguredView()
            case .signedOut:
                SignInView()
            case .needsProfile:
                ProfileSetupView()
            case .ready:
                MainTabView()
            case .failed(let message):
                ContentUnavailableView {
                    Label("Couldn't load your account", systemImage: "wifi.exclamationmark")
                } description: {
                    Text(message)
                } actions: {
                    Button("Try again") { Task { await model.retry() } }
                        .buttonStyle(.borderedProminent)
                    Button("Sign out", role: .destructive) { Task { await model.signOut() } }
                }
            }
        }
        .animation(.smooth, value: model.phase)
    }
}

struct MainTabView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        @Bindable var model = model
        TabView(selection: $model.selectedTab) {
            Tab("Tonight", systemImage: "sun.horizon", value: AppTab.tonight) {
                TonightView()
            }
            Tab("Gatherings", systemImage: "person.3", value: AppTab.gatherings) {
                GatheringsView()
            }
            Tab("Journal", systemImage: "book.closed", value: AppTab.journal) {
                JournalView()
            }
        }
    }
}

private struct LaunchView: View {
    var body: some View {
        ZStack {
            Theme.duskGradient.ignoresSafeArea()
            ProgressView().tint(.white)
        }
    }
}

private struct NotConfiguredView: View {
    var body: some View {
        ContentUnavailableView {
            Label("Backend not configured", systemImage: "gearshape.2")
        } description: {
            Text("Copy ios/OffHours/Config/Secrets.example.xcconfig to Secrets.xcconfig, add your Supabase host and anon key, then rebuild.")
        }
    }
}
