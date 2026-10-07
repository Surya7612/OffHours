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
    @State private var intent: TonightIntent?
    @State private var feedback = ActivityFeedback()
    @State private var skippedTonight: Set<String> = []
    @State private var showCheckIn = false
    @State private var showSkipReasons = false
    @State private var likedTonight: Set<String> = []
    @State private var preferences = EveningPreferences()
    @State private var calendarSavedID: String?
    @State private var isSavingCalendar = false
    @State private var calendarMessage: String?
    @State private var calendarNeedsSettings = false
    @AppStorage("skippedGatheringLogs") private var skippedLogs = ""
    @Environment(\.colorScheme) private var colorScheme

    private var profile: Profile? { model.profile }

    private var tonight: (ranked: [Activity], reason: String?) {
        guard let profile else { return ([], nil) }
        return NudgePicker.tonight(
            for: .now,
            profile: profile,
            conditions: conditions,
            intent: intent,
            feedback: feedback,
            preferences: preferences,
            history: model.logs
        )
    }

    private var ranked: [Activity] {
        let remaining = tonight.ranked.filter { !skippedTonight.contains($0.id) }
        return remaining.isEmpty ? tonight.ranked : remaining
    }

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

                    if model.completedToday.isEmpty || showDoAnother {
                        TonightIntentCard(intent: intent) { showCheckIn = true }
                    }

                    if let done = model.completedToday.first, !showDoAnother {
                        DoneTonightCard(log: done, streak: model.stats.currentStreak) {
                            withAnimation { showDoAnother = true; choiceIndex = 0 }
                        }
                    } else if let activity {
                        ActivityHeroCard(
                            activity: activity,
                            note: choiceIndex == 0 ? tonight.reason ?? personalizedNote : nil,
                            sunsetHint: conditions?.sunsetHint(for: activity, at: .now),
                            place: place,
                            placeCount: places.count,
                            isFindingPlaces: isFindingPlaces,
                            locationDenied: model.location.isDenied,
                            onNextPlace: { placeIndex = (placeIndex + 1) % max(places.count, 1) },
                            onEnableLocation: { Task { await findPlaces(for: activity) } },
                            onStart: { session = ActivitySession(activity: activity, place: place) },
                            liked: likedTonight.contains(activity.id),
                            onMoreLikeThis: { like(activity) },
                            calendarSaved: calendarSavedID == activity.id,
                            isSavingCalendar: isSavingCalendar,
                            onAddToCalendar: { Task { await addToCalendar(activity) } },
                            onSomethingElse: { showSkipReasons = true }
                        )
                        .id(activity.id)
                        .transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity), removal: .opacity))

                        alternatives(excluding: activity)
                    }

                    happeningNearby

                    if conditions?.summary != nil {
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
                await loadAround(fresh: true)
            }
            .task(id: LoadTrigger(activations: model.activations, locationAllowed: model.location.isAuthorized)) {
                loadPersonalization()
                await loadAround()
            }
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
            .sheet(isPresented: $showSettings, onDismiss: loadPersonalization) {
                SettingsView()
            }
            .alert("Calendar", isPresented: Binding(
                get: { calendarMessage != nil },
                set: { if !$0 { calendarMessage = nil } }
            )) {
                if calendarNeedsSettings {
                    Button("Open Settings", action: openSettings)
                }
                Button("OK", role: .cancel) {}
            } message: {
                Text(calendarMessage ?? "")
            }
            .confirmationDialog("What didn't fit?", isPresented: $showSkipReasons, titleVisibility: .visible) {
                if let activity {
                    ForEach(SkipReason.allCases) { reason in
                        Button(reason.label) { skip(activity, reason: reason) }
                    }
                }
                Button("Cancel", role: .cancel) {}
            }
            .sheet(isPresented: $showCheckIn) {
                TonightCheckInSheet(initial: intent ?? TonightIntent()) { chosen in
                    save(chosen)
                }
            }
        }
    }

    private var personalizedNote: String? {
        guard let intent else { return nil }
        return switch intent.company {
        case .solo: "A solo plan that fits your \(intent.time.label.lowercased())."
        case .social: "Something social that fits your \(intent.time.label.lowercased())."
        case .either: "Matched to your time and energy tonight."
        }
    }

    private func loadPersonalization() {
        guard let userID = model.userID else { return }
        let saved = TonightPersonalizationStore.intent(for: userID)
        if intent != saved {
            intent = saved
            skippedTonight = []
            choiceIndex = 0
        }
        feedback = TonightPersonalizationStore.feedback(for: userID)
        preferences = EveningPreferencesStore.load(for: userID)
    }

    private func save(_ chosen: TonightIntent) {
        guard let userID = model.userID else { return }
        TonightPersonalizationStore.save(chosen, for: userID)
        withAnimation(.snappy) {
            intent = chosen
            skippedTonight = []
            choiceIndex = 0
        }
    }

    private func skip(_ activity: Activity, reason: SkipReason) {
        if let userID = model.userID {
            TonightPersonalizationStore.recordSkip(activityID: activity.id, reason: reason, for: userID)
            feedback = TonightPersonalizationStore.feedback(for: userID)
        }
        withAnimation(.snappy) {
            skippedTonight.insert(activity.id)
            choiceIndex = 0
        }
    }

    private func addToCalendar(_ activity: Activity) async {
        guard let profile, !isSavingCalendar else { return }
        isSavingCalendar = true
        defer { isSavingCalendar = false }
        let start = CalendarPlanner.plannedStart(hour: profile.nudgeHour, minute: profile.nudgeMinute)
        let placeName = place?.name
        let outcome = await CalendarPlanner.save(
            title: activity.title,
            start: start,
            minutes: activity.minutes,
            location: placeName,
            notes: [activity.summary, "Planned with OffHours"].joined(separator: "\n")
        )
        switch outcome {
        case .saved:
            calendarSavedID = activity.id
        case .denied:
            calendarNeedsSettings = true
            calendarMessage = "OffHours can add this evening once Calendar access is on."
        case .failed:
            calendarNeedsSettings = false
            calendarMessage = "Couldn't add that to your calendar."
        }
    }

    private func like(_ activity: Activity) {
        guard let userID = model.userID else { return }
        TonightPersonalizationStore.recordLike(kind: activity.kind.rawValue, for: userID)
        feedback = TonightPersonalizationStore.feedback(for: userID)
        withAnimation(.snappy) { likedTonight.insert(activity.id) }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 10) {
                Text(Date.now, format: .dateTime.weekday(.wide).month().day())
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)

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
            conditionsLine
            Text(greeting)
                .font(.system(.largeTitle, design: .serif, weight: .semibold))
        }
        .padding(.top, 8)
    }

    @ViewBuilder
    private var conditionsLine: some View {
        if let summary = conditions?.summary {
            Label(summary, systemImage: conditions?.symbol ?? "cloud")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.secondary)
                .lineLimit(1)
        } else if model.location.isDenied {
            Button("Turn on location to see the weather") { openSettings() }
                .font(.subheadline.weight(.medium))
        } else if let sunset = conditions?.sunset {
            Label("Sunset \(sunset.formatted(date: .omitted, time: .shortened))", systemImage: "sunset")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.secondary)
        }
    }

    private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
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
    private func loadAround(fresh: Bool = false) async {
        guard let backend = model.backend, let profile else { return }
        let cutoff = Date.now.addingTimeInterval(24 * 60 * 60)
        async let going = backend.myUpcomingGatherings()
        async let unlogged = backend.gatheringsToLog()
        var nearby: [Gathering] = []
        if await model.location.isAllowed(), let here = await model.location.currentLocation() {
            async let weather = WeatherProvider.conditions(at: here, fresh: fresh)
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

private struct TonightIntentCard: View {
    let intent: TonightIntent?
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 14) {
                Image(systemName: intent == nil ? "slider.horizontal.3" : "checkmark.circle.fill")
                    .font(.title3)
                    .foregroundStyle(Theme.ember)
                    .frame(width: 42, height: 42)
                    .background(Theme.ember.opacity(0.12), in: .circle)
                VStack(alignment: .leading, spacing: 3) {
                    Text(intent == nil ? "What fits tonight?" : "Tonight is tuned")
                        .font(.headline)
                    Text(intent?.summary ?? "Time, energy, budget and company")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .card()
    }
}

private struct TonightCheckInSheet: View {
    let onSave: (TonightIntent) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var draft: TonightIntent

    init(initial: TonightIntent, onSave: @escaping (TonightIntent) -> Void) {
        self.onSave = onSave
        _draft = State(initialValue: initial)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("How much time do you have?") {
                    Picker("Time", selection: $draft.time) {
                        ForEach(TonightIntent.Time.allCases) { Text($0.label).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    .labelsHidden()
                }

                Section("How's your energy?") {
                    Picker("Energy", selection: $draft.energy) {
                        ForEach(TonightIntent.Energy.allCases) {
                            Label($0.label, systemImage: $0.symbol).tag($0)
                        }
                    }
                    .pickerStyle(.segmented)
                    .labelsHidden()
                }

                Section("What works tonight?") {
                    Picker("Budget", selection: $draft.budget) {
                        ForEach(TonightIntent.Budget.allCases) { Text($0.label).tag($0) }
                    }
                    .pickerStyle(.segmented)

                    Picker("Company", selection: $draft.company) {
                        ForEach(TonightIntent.Company.allCases) { Text($0.label).tag($0) }
                    }
                    .pickerStyle(.segmented)
                }

                Section {
                    Text("These answers stay on this iPhone and expire at midnight.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("What fits tonight?")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Find my plan") {
                        onSave(draft)
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.large])
    }
}

/// Tonight reloads when the app returns to the foreground and when location access is granted.
private struct LoadTrigger: Equatable {
    var activations: Int
    var locationAllowed: Bool
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
    let liked: Bool
    let onMoreLikeThis: () -> Void
    let calendarSaved: Bool
    let isSavingCalendar: Bool
    let onAddToCalendar: () -> Void
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
                HStack(spacing: 16) {
                    Button(liked ? "Saved for next time" : "More like this", action: onMoreLikeThis)
                        .disabled(liked)
                    Button("Something else", action: onSomethingElse)
                }
                .font(.subheadline.weight(.medium))
                .frame(maxWidth: .infinity)
                Button(calendarSaved ? "On your calendar" : "Add to Calendar", systemImage: "calendar.badge.plus", action: onAddToCalendar)
                    .disabled(calendarSaved || isSavingCalendar)
                    .font(.subheadline.weight(.medium))
                    .frame(maxWidth: .infinity)
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
    let attribution: WeatherProvider.Attribution?
    let colorScheme: ColorScheme

    var body: some View {
        HStack(spacing: 8) {
            if let attribution {
                AsyncImage(url: colorScheme == .dark ? attribution.darkMark : attribution.lightMark) { image in
                    image.resizable().scaledToFit()
                } placeholder: {
                    Text(" Weather")
                }
                .frame(height: 12)
            } else {
                Text(" Weather")
            }
            Link("Data sources", destination: attribution?.legalPage ?? WeatherProvider.legalPage)
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
