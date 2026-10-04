import SwiftUI

struct JournalView: View {
    @Environment(AppModel.self) private var model
    @State private var errorMessage: String?

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
