import SwiftUI

struct TonightView: View {
    @Environment(AppModel.self) private var model
    @State private var choiceIndex = 0
    @State private var places: [Place] = []
    @State private var placeIndex = 0
    @State private var isFindingPlaces = false
    @State private var showDoAnother = false
    @State private var session: ActivitySession?
    @State private var showSettings = false
    @State private var soonGatherings: [Gathering] = []
    @State private var toLog: [GatheringToLog] = []
    @State private var loggingGathering: GatheringToLog?
    @State private var conditions: EveningConditions?
    @State private var weatherAttribution: WeatherProvider.Attribution?
    @AppStorage("skippedGatheringLogs") private var skippedLogs = ""
    @Environment(\.colorScheme) private var colorScheme

    private var profile: Profile? { model.profile }

    private var tonight: (ranked: [Activity], reason: String?) {
        guard let profile else { return ([], nil) }
        return NudgePicker.tonight(for: .now, profile: profile, conditions: conditions)
    }

    private var ranked: [Activity] { tonight.ranked }

    private var pendingLog: GatheringToLog? {
        let skipped = Set(skippedLogs.split(separator: ",").map(String.init))
        return toLog.first { !skipped.contains($0.id.uuidString) }
    }

    private var activity: Activity? {
        guard !ranked.isEmpty else { return nil }
        return ranked[choiceIndex % ranked.count]
    }

    private var place: Place? {
        places.indices.contains(placeIndex) ? places[placeIndex] : nil
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    header

                    if let pendingLog {
                        GatheringLogCard(
                            gathering: pendingLog,
                            onWent: { loggingGathering = pendingLog },
                            onSkip: { skip(pendingLog) }
                        )
                    }

                    if let done = model.completedToday.first, !showDoAnother {
                        DoneTonightCard(log: done, streak: model.stats.currentStreak) {
                            withAnimation { showDoAnother = true; choiceIndex = 1 }
                        }
                    } else if let activity {
                        ActivityHeroCard(
                            activity: activity,
                            note: choiceIndex == 0 ? tonight.reason : nil,
                            sunsetHint: conditions?.sunsetHint(for: activity, at: .now),
                            place: place,
                            placeCount: places.count,
                            isFindingPlaces: isFindingPlaces,
                            locationDenied: model.location.isDenied,
                            onNextPlace: { placeIndex = (placeIndex + 1) % max(places.count, 1) },
                            onEnableLocation: { Task { await findPlaces(for: activity) } },
                            onStart: { session = ActivitySession(activity: activity, place: place) },
                            onSomethingElse: { withAnimation(.snappy) { choiceIndex += 1 } }
                        )
                        .id(activity.id)
                        .transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity), removal: .opacity))

                        alternatives(excluding: activity)
                    }

                    happeningNearby

                    if let weatherAttribution {
                        WeatherAttributionView(attribution: weatherAttribution, colorScheme: colorScheme)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }
            .background(Color(.systemGroupedBackground))
            .toolbar(.hidden, for: .navigationBar)
            .refreshable {
                await model.refreshJournal()
                await loadAround()
            }
            .task(id: model.activations) { await loadAround() }
            .task(id: activity?.id) {
                model.showingTonight(model.completedToday.isEmpty ? activity : nil)
                guard let activity else { return }
                await findPlaces(for: activity)
            }
            .sheet(item: $loggingGathering) { gathering in
                LogGatheringSheet(gathering: gathering) {
                    withAnimation { toLog.removeAll { $0.id == gathering.id } }
                }
            }
            .fullScreenCover(item: $session) { session in
                ActivitySessionView(session: session)
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 10) {
                HStack(spacing: 6) {
                    Text(Date.now, format: .dateTime.weekday(.wide).month().day())
                    if let summary = conditions?.summary {
                        Text("·")
                        Label(summary, systemImage: conditions?.symbol ?? "cloud")
                            .labelStyle(.titleAndIcon)
                    } else if let sunset = conditions?.sunset, sunset > .now {
                        Text("·")
                        Label("Sunset \(sunset.formatted(date: .omitted, time: .shortened))", systemImage: "sunset")
                    }
                }
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .minimumScaleFactor(0.8)

                Spacer(minLength: 0)

                if model.stats.currentStreak > 0 {
                    Label("\(model.stats.currentStreak)", systemImage: "flame.fill")
                        .font(.headline)
                        .foregroundStyle(Theme.ember)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Theme.ember.opacity(0.12), in: .capsule)
                        .accessibilityLabel("\(model.stats.currentStreak) day streak")
                }
                Button("Settings", systemImage: "person.crop.circle") { showSettings = true }
                    .labelStyle(.iconOnly)
                    .font(.title2)
                    .foregroundStyle(.secondary)
            }
            Text(greeting)
                .font(.system(.largeTitle, design: .serif, weight: .semibold))
        }
        .padding(.top, 8)
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: .now)
        let name = profile?.firstName ?? ""
        let part = switch hour {
        case 5..<12: "Good morning"
        case 12..<17: "Good afternoon"
        default: "Good evening"
        }
        return name.isEmpty ? part : "\(part), \(name)"
    }

    @ViewBuilder
    private func alternatives(excluding current: Activity) -> some View {
        let others = ranked.filter { $0.id != current.id }.prefix(3)
        if !others.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                Text("Also good tonight")
                    .font(.headline)
                ForEach(Array(others)) { other in
                    Button {
                        if let index = ranked.firstIndex(of: other) {
                            withAnimation(.snappy) { choiceIndex = index }
                        }
                    } label: {
                        HStack(spacing: 14) {
                            Image(systemName: other.kind.symbol)
                                .font(.title3)
                                .foregroundStyle(other.kind.tint)
                                .frame(width: 44, height: 44)
                                .background(other.kind.tint.opacity(0.12), in: .rect(cornerRadius: 12))
                            VStack(alignment: .leading, spacing: 2) {
                                Text(other.title).font(.body.weight(.medium))
                                Text("\(other.minutes) min · \(other.kind.label)")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(.tertiary)
                        }
                        .contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                }
            }
            .card()
        }
    }

    @ViewBuilder
    private var happeningNearby: some View {
        let current = soonGatherings.filter { !$0.hasEnded }
        if !current.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                Text("Happening near you")
                    .font(.headline)
                ForEach(current) { gathering in
                    Button {
                        model.openGathering(gathering.id)
                    } label: {
                        HStack {
                            GatheringRow(gathering: gathering, isHost: gathering.hostID == model.userID)
                            Image(systemName: "chevron.right")
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(.tertiary)
                        }
                        .contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                }
            }
            .card()
        }
    }

    /// Everything on Tonight that depends on the world outside: weather and sunset, gatherings in
    /// the next day (ones you're going to first), and past gatherings to log.
    private func loadAround() async {
        guard let backend = model.backend, let profile else { return }
        let cutoff = Date.now.addingTimeInterval(24 * 60 * 60)
        async let going = backend.myUpcomingGatherings()
        async let unlogged = backend.gatheringsToLog()
        var nearby: [Gathering] = []
        if model.location.isAuthorized, let here = await model.location.currentLocation() {
            async let weather = WeatherProvider.conditions(at: here)
            nearby = (try? await backend.nearbyGatherings(
                latitude: here.coordinate.latitude,
                longitude: here.coordinate.longitude,
                radiusKm: Double(profile.radiusKm)
            )) ?? []
            let (found, attribution) = await weather
            withAnimation { conditions = found }
            weatherAttribution = attribution
        }
        let mine = (try? await going) ?? []
        var seen = Set<UUID>()
        soonGatherings = (mine + nearby)
            .filter { $0.startsAt <= cutoff && !$0.hasEnded && seen.insert($0.id).inserted }
            .prefix(3)
            .map { $0 }
        if let unlogged = try? await unlogged { toLog = unlogged }
    }

    private func skip(_ gathering: GatheringToLog) {
        withAnimation {
            skippedLogs = (skippedLogs.split(separator: ",").map(String.init).suffix(30) + [gathering.id.uuidString])
                .joined(separator: ",")
        }
        NotificationScheduler.cancelGatheringFollowUp(for: gathering.id)
    }

    private func findPlaces(for activity: Activity) async {
        places = []
        placeIndex = 0
        guard let kind = activity.place, let profile else { return }
        isFindingPlaces = true
        defer { isFindingPlaces = false }
        guard let location = await model.location.currentLocation() else { return }
        places = Array(await PlaceFinder.nearest(kind, around: location, withinKm: profile.radiusKm).prefix(5))
    }
}

private struct ActivityHeroCard: View {
    let activity: Activity
    let note: String?
    let sunsetHint: String?
    let place: Place?
    let placeCount: Int
    let isFindingPlaces: Bool
    let locationDenied: Bool
    let onNextPlace: () -> Void
    let onEnableLocation: () -> Void
    let onStart: () -> Void
    let onSomethingElse: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            if let note {
                Label(note, systemImage: "house")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 4)
            }

            VStack(alignment: .leading, spacing: 12) {
                Text("TONIGHT")
                    .font(.caption.weight(.bold))
                    .tracking(1.5)
                    .opacity(0.8)
                Text(activity.title)
                    .font(.system(.title, design: .serif, weight: .semibold))
                Text(activity.summary)
                    .font(.body)
                    .opacity(0.92)
                HStack(spacing: 8) {
                    Label("\(activity.minutes) min", systemImage: "clock")
                    Text("·")
                    Label(activity.kind.label, systemImage: activity.kind.symbol)
                }
                .font(.subheadline.weight(.medium))
                .opacity(0.9)
            }
            .foregroundStyle(.white)
            .padding(22)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.duskGradient, in: .rect(cornerRadius: 24))

            if let sunsetHint {
                Label(sunsetHint, systemImage: "sunset")
                    .font(.subheadline)
                    .foregroundStyle(Theme.ember)
                    .padding(.horizontal, 4)
            }

            if !activity.bring.isEmpty {
                Label("Bring: \(activity.bring.joined(separator: ", "))", systemImage: "bag")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 4)
            }

            if let kind = activity.place {
                placeRow(kind)
            }

            VStack(spacing: 10) {
                Button("Start", systemImage: "play.fill", action: onStart)
                    .buttonStyle(.primary)
                Button("Something else", action: onSomethingElse)
                    .font(.subheadline.weight(.medium))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            }
        }
    }

    @ViewBuilder
    private func placeRow(_ kind: Activity.PlaceKind) -> some View {
        HStack(spacing: 14) {
            Image(systemName: "mappin.circle.fill")
                .font(.title)
                .foregroundStyle(Theme.ember)

            if let place {
                VStack(alignment: .leading, spacing: 2) {
                    Text(place.name)
                        .font(.body.weight(.semibold))
                        .lineLimit(1)
                    Text([place.distanceMeters?.formattedDistance, place.address.isEmpty ? nil : place.address]
                        .compactMap { $0 }
                        .joined(separator: " · "))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                Spacer(minLength: 8)
                if placeCount > 1 {
                    Button("Another \(kind.noun)", systemImage: "arrow.triangle.2.circlepath", action: onNextPlace)
                        .labelStyle(.iconOnly)
                        .buttonStyle(.bordered)
                        .buttonBorderShape(.circle)
                }
                Button("Directions", systemImage: "arrow.triangle.turn.up.right.diamond.fill") { place.openInMaps() }
                    .labelStyle(.iconOnly)
                    .buttonStyle(.borderedProminent)
                    .buttonBorderShape(.circle)
                    .tint(Theme.ember)
            } else if isFindingPlaces {
                Text("Finding a \(kind.noun) near you…")
                    .foregroundStyle(.secondary)
                Spacer()
                ProgressView()
            } else if locationDenied {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Any \(kind.noun) nearby works")
                        .font(.body.weight(.medium))
                    Text("Allow location in Settings to get a suggestion.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            } else {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Find a \(kind.noun) near you")
                        .font(.body.weight(.medium))
                    Text("Uses your location once. Nothing is stored.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button("Find", action: onEnableLocation)
                    .buttonStyle(.bordered)
            }
        }
        .card()
    }
}

private struct GatheringLogCard: View {
    let gathering: GatheringToLog
    let onWent: () -> Void
    let onSkip: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("How was it?", systemImage: "person.3.fill")
                .font(.headline)
                .foregroundStyle(Activity.Kind.community.tint)
            Text("\(gathering.title) at \(gathering.placeName), \(gathering.startsAt.formatted(.relative(presentation: .named)))")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            HStack {
                Button("I went", action: onWent)
                    .buttonStyle(.borderedProminent)
                    .tint(Theme.ember)
                Button("Didn't make it", action: onSkip)
                    .buttonStyle(.bordered)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }
}

private struct LogGatheringSheet: View {
    let gathering: GatheringToLog
    let onLogged: () -> Void
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var reflection = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text(gathering.title).font(.headline)
                    Text("\(gathering.durationMinutes) min at \(gathering.placeName)")
                        .foregroundStyle(.secondary)
                }
                Section("One line to remember it by") {
                    TextField("I met…", text: $reflection, axis: .vertical)
                        .lineLimit(3...6)
                }
                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }
            }
            .navigationTitle("Add to journal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                        .disabled(isSaving)
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func save() {
        isSaving = true
        let text = reflection.trimmingCharacters(in: .whitespacesAndNewlines)
        Task {
            defer { isSaving = false }
            do {
                try await model.logGathering(gathering, reflection: text.isEmpty ? nil : String(text.prefix(500)))
                onLogged()
                dismiss()
            } catch {
                errorMessage = error.userMessage
            }
        }
    }
}

/// Apple Weather's mark and legal link, required wherever WeatherKit data is shown.
private struct WeatherAttributionView: View {
    let attribution: WeatherProvider.Attribution
    let colorScheme: ColorScheme

    var body: some View {
        HStack(spacing: 8) {
            AsyncImage(url: colorScheme == .dark ? attribution.darkMark : attribution.lightMark) { image in
                image.resizable().scaledToFit()
            } placeholder: {
                Text(" Weather")
            }
            .frame(height: 12)
            Link("Data sources", destination: attribution.legalPage)
        }
        .font(.caption2)
        .foregroundStyle(.secondary)
        .frame(maxWidth: .infinity)
    }
}

private struct DoneTonightCard: View {
    let log: ActivityLog
    let streak: Int
    let onDoAnother: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 40))
                .foregroundStyle(.white)
            VStack(alignment: .leading, spacing: 6) {
                Text("Done for tonight")
                    .font(.system(.title, design: .serif, weight: .semibold))
                Text("\(log.title), \(log.durationMinutes) min")
                    .opacity(0.9)
                if let reflection = log.reflection, !reflection.isEmpty {
                    Text("“\(reflection)”")
                        .italic()
                        .opacity(0.9)
                        .padding(.top, 4)
                }
            }
            .foregroundStyle(.white)
            if streak > 1 {
                Label("\(streak) evenings in a row", systemImage: "flame.fill")
                    .font(.headline)
                    .foregroundStyle(.white)
            }
            Button("Do another", action: onDoAnother)
                .buttonStyle(.bordered)
                .tint(.white)
        }
        .padding(22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.duskGradient, in: .rect(cornerRadius: 24))
    }
}
