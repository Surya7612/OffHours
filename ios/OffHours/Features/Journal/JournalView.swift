import SwiftUI
import UniformTypeIdentifiers

struct JournalView: View {
    @Environment(AppModel.self) private var model
    @State private var errorMessage: String?
    @State private var recapImage: WeekRecapImage?

    private var groupedLogs: [(day: Date, logs: [ActivityLog])] {
        let calendar = Calendar.current
        let groups = Dictionary(grouping: model.logs) { calendar.startOfDay(for: $0.completedAt) }
        return groups.keys.sorted(by: >).map { ($0, groups[$0] ?? []) }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    StatsGrid(stats: model.stats)
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                }

                if model.logs.isEmpty {
                    ContentUnavailableView(
                        "Your journal is empty",
                        systemImage: "book.closed",
                        description: Text("Finish tonight's activity and it will show up here, along with anything you wrote about it.")
                    )
                    .listRowBackground(Color.clear)
                } else {
                    ForEach(groupedLogs, id: \.day) { group in
                        Section(sectionTitle(for: group.day)) {
                            ForEach(group.logs) { log in
                                JournalRow(log: log)
                            }
                            .onDelete { offsets in
                                let targets = offsets.map { group.logs[$0] }
                                Task {
                                    for log in targets {
                                        do { try await model.deleteLog(log) } catch { errorMessage = error.userMessage }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Journal")
            .toolbar {
                if let recapImage {
                    ToolbarItem(placement: .primaryAction) {
                        ShareLink(
                            item: recapImage,
                            preview: SharePreview("This week offline", image: Image(uiImage: recapImage.image))
                        ) {
                            Label("Share week", systemImage: "square.and.arrow.up")
                        }
                    }
                }
            }
            .task(id: model.logs) { recapImage = WeekRecapImage.render(logs: model.logs, streak: model.stats.currentStreak) }
            .refreshable { await model.refreshJournal() }
            .alert("Couldn't delete", isPresented: Binding(
                get: { errorMessage != nil },
                set: { if !$0 { errorMessage = nil } }
            )) {
                Button("OK") {}
            } message: {
                Text(errorMessage ?? "")
            }
        }
    }

    private func sectionTitle(for day: Date) -> String {
        let calendar = Calendar.current
        if calendar.isDateInToday(day) { return "Today" }
        if calendar.isDateInYesterday(day) { return "Yesterday" }
        return day.formatted(.dateTime.weekday(.wide).month().day())
    }
}

struct WeekRecapImage: Transferable, Sendable {
    let png: Data

    var image: UIImage { UIImage(data: png) ?? UIImage() }

    static var transferRepresentation: some TransferRepresentation {
        DataRepresentation(exportedContentType: .png) { $0.png }
    }

    @MainActor
    static func render(logs: [ActivityLog], streak: Int) -> WeekRecapImage? {
        let week = WeekSummary(logs: logs)
        guard week.moments > 0 else { return nil }
        let renderer = ImageRenderer(content: WeekRecapCard(week: week, streak: streak))
        renderer.scale = 3
        guard let png = renderer.uiImage?.pngData() else { return nil }
        return WeekRecapImage(png: png)
    }
}

private struct WeekRecapCard: View {
    let week: WeekSummary
    let streak: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("OFFHOURS")
                .font(.caption.weight(.bold))
                .tracking(2)
                .opacity(0.8)
            Text(headline)
                .font(.system(size: 34, weight: .semibold, design: .serif))
            Text(week.recapText)
                .font(.title3)
                .fixedSize(horizontal: false, vertical: true)
            if streak > 0 {
                Label("\(streak) evening streak", systemImage: "flame.fill")
                    .font(.headline)
            }
            Text("Phone down. Evening kept.")
                .font(.footnote.weight(.medium))
                .opacity(0.85)
        }
        .foregroundStyle(.white)
        .padding(28)
        .frame(width: 360, alignment: .leading)
        .background(Theme.duskGradient)
    }

    private var headline: String {
        week.days == 1 ? "1 evening offline" : "\(week.days) evenings offline"
    }
}

private struct StatsGrid: View {
    let stats: JournalStats

    var body: some View {
        Grid(horizontalSpacing: 12, verticalSpacing: 12) {
            GridRow {
                Stat(value: "\(stats.currentStreak)", label: "evening streak", symbol: "flame.fill", tint: Theme.ember)
                Stat(value: "\(stats.longestStreak)", label: "longest streak", symbol: "trophy.fill", tint: .yellow)
            }
            GridRow {
                Stat(value: "\(stats.totalMoments)", label: stats.totalMoments == 1 ? "moment" : "moments", symbol: "sparkles", tint: .purple)
                Stat(value: hours, label: "offline", symbol: "clock.fill", tint: .teal)
            }
        }
    }

    private var hours: String {
        Duration.seconds(stats.totalMinutes * 60)
            .formatted(.units(allowed: [.hours, .minutes], width: .narrow, maximumUnitCount: 1))
    }
}

private struct Stat: View {
    let value: String
    let label: String
    let symbol: String
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: symbol)
                .foregroundStyle(tint)
            Text(value)
                .font(.system(.title, design: .rounded, weight: .semibold))
                .contentTransition(.numericText())
            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.background, in: .rect(cornerRadius: 20))
        .accessibilityElement(children: .combine)
    }
}

private struct JournalRow: View {
    let log: ActivityLog

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            let kind = log.activityKind ?? .mindful
            Image(systemName: kind.symbol)
                .foregroundStyle(kind.tint)
                .frame(width: 36, height: 36)
                .background(kind.tint.opacity(0.12), in: .rect(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 4) {
                Text(log.title).font(.body.weight(.medium))
                Text([
                    "\(log.durationMinutes) min",
                    log.placeName,
                    log.completedAt.formatted(date: .omitted, time: .shortened),
                ].compactMap { $0 }.joined(separator: " · "))
                .font(.subheadline)
                .foregroundStyle(.secondary)
                if let reflection = log.reflection, !reflection.isEmpty {
                    Text(reflection)
                        .font(.subheadline)
                        .italic()
                        .padding(.top, 2)
                }
            }
        }
        .padding(.vertical, 2)
    }
}
