import SwiftUI

struct GatheringsView: View {
    @Environment(AppModel.self) private var app
    @State private var model = GatheringsModel()
    @State private var showCreate = false
    @State private var selected: Gathering?
    @State private var isEnablingAlerts = false
    @State private var alertError: String?
    @AppStorage("dismissedAlertsPrompt") private var dismissedAlertsPrompt = false

    var body: some View {
        NavigationStack {
            List {
                if app.profile?.gatheringAlerts == false && !dismissedAlertsPrompt {
                    alertsPrompt
                }

                if !model.going.isEmpty {
                    Section("You're going") {
                        ForEach(model.going) { gathering in
                            row(gathering)
                        }
                    }
                }

                Section {
                    switch model.state {
                    case .idle, .loading:
                        HStack {
                            Spacer()
                            ProgressView()
                            Spacer()
                        }
                        .listRowBackground(Color.clear)
                    case .needsLocation:
                        ContentUnavailableView {
                            Label("Location is off", systemImage: "location.slash")
                        } description: {
                            Text("Allow location access to see gatherings within \(app.profile?.radiusKm ?? 3) km of you.")
                        } actions: {
                            if app.location.isDenied {
                                Button("Open Settings") { openSettings() }
                            } else {
                                Button("Allow location") { Task { await model.load(app: app) } }
                            }
                        }
                        .listRowBackground(Color.clear)
                    case .failed(let message):
                        ContentUnavailableView {
                            Label("Couldn't load gatherings", systemImage: "wifi.exclamationmark")
                        } description: {
                            Text(message)
                        } actions: {
                            Button("Try again") { Task { await model.load(app: app) } }
                        }
                        .listRowBackground(Color.clear)
                    case .loaded where model.nearby.isEmpty:
                        ContentUnavailableView {
                            Label("Nothing nearby yet", systemImage: "person.3")
                        } description: {
                            Text("Be the first. Host a walk, a coffee or a quiet hour at a park and neighbors can join.")
                        } actions: {
                            Button("Host a gathering") { showCreate = true }
                                .buttonStyle(.borderedProminent)
                                .tint(Theme.ember)
                        }
                        .listRowBackground(Color.clear)
                    case .loaded:
                        ForEach(model.nearby) { gathering in
                            row(gathering)
                        }
                    }
                } header: {
                    if model.state == .loaded && !model.nearby.isEmpty {
                        Text("Near you")
                    }
                }
            }
            .navigationTitle("Gatherings")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button("Host", systemImage: "plus") { showCreate = true }
                }
            }
            .refreshable { await model.load(app: app) }
            .task { await model.load(app: app) }
            .navigationDestination(item: $selected) { gathering in
                GatheringDetailView(gathering: gathering, model: model)
            }
            .sheet(isPresented: $showCreate) {
                CreateGatheringView(near: model.location) { created in
                    Task { await model.created(created, app: app) }
                }
            }
            .task(id: app.gatheringToOpen) {
                guard let id = app.gatheringToOpen else { return }
                app.gatheringToOpen = nil
                if let gathering = await model.resolve(id, app: app) {
                    selected = gathering
                }
            }
        }
    }

    private var alertsPrompt: some View {
        Section {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top) {
                    Label("Hear about gatherings near you", systemImage: "bell.badge")
                        .font(.headline)
                    Spacer()
                    Button("Not now", systemImage: "xmark") { dismissedAlertsPrompt = true }
                        .labelStyle(.iconOnly)
                        .foregroundStyle(.secondary)
                        .buttonStyle(.borderless)
                }
                Text("At most one alert a day when a neighbor hosts something within \(app.profile?.radiusKm ?? 3) km. You can turn it off in Settings.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                if let alertError {
                    Text(alertError).font(.footnote).foregroundStyle(.red)
                }
                Button {
                    Task {
                        isEnablingAlerts = true
                        defer { isEnablingAlerts = false }
                        do {
                            try await app.setGatheringAlerts(true)
                            alertError = nil
                        } catch {
                            alertError = error.userMessage
                        }
                    }
                } label: {
                    if isEnablingAlerts { ProgressView() } else { Text("Turn on alerts") }
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.ember)
                .disabled(isEnablingAlerts)
            }
            .padding(.vertical, 6)
        }
    }

    private func row(_ gathering: Gathering) -> some View {
        Button {
            selected = gathering
        } label: {
            GatheringRow(gathering: gathering, isHost: gathering.hostID == app.userID)
        }
        .foregroundStyle(.primary)
    }

    private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
}

struct GatheringRow: View {
    let gathering: Gathering
    let isHost: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            VStack(spacing: 0) {
                Text(gathering.startsAt, format: .dateTime.month(.abbreviated))
                    .font(.caption2.weight(.bold))
                    .textCase(.uppercase)
                    .foregroundStyle(Theme.ember)
                Text(gathering.startsAt, format: .dateTime.day())
                    .font(.title2.weight(.semibold))
            }
            .frame(width: 48, height: 52)
            .background(Theme.ember.opacity(0.1), in: .rect(cornerRadius: 12))

            VStack(alignment: .leading, spacing: 4) {
                Text(gathering.title)
                    .font(.body.weight(.semibold))
                    .lineLimit(2)
                Text(gathering.startsAt, format: .dateTime.weekday(.abbreviated).hour().minute())
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                HStack(spacing: 6) {
                    Label(gathering.placeName, systemImage: "mappin")
                        .lineLimit(1)
                    if let km = gathering.distanceKm {
                        Text("· \((km * 1000).formattedDistance)")
                    }
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)
                HStack(spacing: 8) {
                    if isHost {
                        Tag(text: "Hosting", color: Theme.ember)
                    } else if gathering.going {
                        Tag(text: "Going", color: .green)
                    }
                    Text(gathering.isFull ? "Full" : "\(gathering.spotsLeft) of \(gathering.capacity) spots left")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 2)
            }
        }
        .padding(.vertical, 4)
    }
}

struct Tag: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.14), in: .capsule)
    }
}
