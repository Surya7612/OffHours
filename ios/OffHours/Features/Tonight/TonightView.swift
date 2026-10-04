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

    private var profile: Profile? { model.profile }

    private var ranked: [Activity] {
        guard let profile else { return [] }
        return NudgePicker.ranked(for: .now, profile: profile)
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

                    if let done = model.completedToday.first, !showDoAnother {
                        DoneTonightCard(log: done, streak: model.stats.currentStreak) {
                            withAnimation { showDoAnother = true; choiceIndex = 1 }
                        }
                    } else if let activity {
                        ActivityHeroCard(
                            activity: activity,
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
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }
            .background(Color(.systemGroupedBackground))
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Settings", systemImage: "person.crop.circle") { showSettings = true }
                }
            }
            .refreshable {
                await model.refreshJournal()
                await loadSoonGatherings()
            }
            .task { await loadSoonGatherings() }
            .task(id: activity?.id) {
                guard let activity else { return }
                await findPlaces(for: activity)
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
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 4) {
                Text(Date.now, format: .dateTime.weekday(.wide).month().day())
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.secondary)
                Text(greeting)
                    .font(.system(.largeTitle, design: .serif, weight: .semibold))
            }
            Spacer()
            if model.stats.currentStreak > 0 {
                Label("\(model.stats.currentStreak)", systemImage: "flame.fill")
                    .font(.headline)
                    .foregroundStyle(Theme.ember)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Theme.ember.opacity(0.12), in: .capsule)
                    .accessibilityLabel("\(model.stats.currentStreak) day streak")
            }
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
        if !soonGatherings.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                Text("Happening near you")
                    .font(.headline)
                ForEach(soonGatherings) { gathering in
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

    /// Gatherings starting in the next day: ones you're going to first, then nearby ones.
    private func loadSoonGatherings() async {
        guard let backend = model.backend, let profile else { return }
        let cutoff = Date.now.addingTimeInterval(24 * 60 * 60)
        async let going = backend.myUpcomingGatherings()
        var nearby: [Gathering] = []
        if model.location.isAuthorized, let here = await model.location.currentLocation() {
            nearby = (try? await backend.nearbyGatherings(
                latitude: here.coordinate.latitude,
                longitude: here.coordinate.longitude,
                radiusKm: Double(profile.radiusKm)
            )) ?? []
        }
        let mine = (try? await going) ?? []
        var seen = Set<UUID>()
        soonGatherings = (mine + nearby)
            .filter { $0.startsAt <= cutoff && $0.endsAt > .now && seen.insert($0.id).inserted }
            .prefix(3)
            .map { $0 }
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
