import SwiftUI
import WidgetKit

struct TonightEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?
}

struct TonightProvider: TimelineProvider {
    func placeholder(in context: Context) -> TonightEntry {
        TonightEntry(date: .now, snapshot: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (TonightEntry) -> Void) {
        completion(TonightEntry(date: .now, snapshot: context.isPreview ? .placeholder : WidgetBridge.load()))
    }

    /// One entry now and one at midnight, when the widget switches to tomorrow's pick.
    func getTimeline(in context: Context, completion: @escaping (Timeline<TonightEntry>) -> Void) {
        let snapshot = WidgetBridge.load()
        let midnight = Calendar.current.startOfDay(for: .now.addingTimeInterval(24 * 60 * 60))
        let entries = [
            TonightEntry(date: .now, snapshot: snapshot),
            TonightEntry(date: midnight, snapshot: snapshot),
        ]
        completion(Timeline(entries: entries, policy: .after(midnight.addingTimeInterval(24 * 60 * 60))))
    }
}

struct TonightWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "TonightWidget", provider: TonightProvider()) { entry in
            TonightWidgetView(entry: entry)
                .containerBackground(for: .widget) { WidgetTheme.gradient }
        }
        .configurationDisplayName("Tonight")
        .description("Tonight's offline moment and your streak.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular, .accessoryInline])
    }
}

struct TonightWidgetView: View {
    let entry: TonightEntry
    @Environment(\.widgetFamily) private var family

    private var pick: WidgetSnapshot.Pick? { entry.snapshot?.pick(at: entry.date) }
    private var isDone: Bool { entry.snapshot?.isDone(at: entry.date) ?? false }
    private var streak: Int { entry.snapshot?.streak ?? 0 }

    var body: some View {
        switch family {
        case .accessoryInline:
            if isDone {
                Label("Done tonight", systemImage: "checkmark.seal")
            } else if let pick {
                Label("\(pick.title), \(pick.minutes) min", systemImage: pick.symbol)
            } else {
                Text("Open OffHours")
            }
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 0) {
                    Image(systemName: isDone ? "checkmark" : "flame.fill")
                        .font(.caption)
                    Text("\(streak)")
                        .font(.title3.weight(.semibold))
                }
            }
            .accessibilityLabel("\(streak) day streak")
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Text(isDone ? "Done tonight" : "Tonight")
                    .font(.caption.weight(.semibold))
                    .widgetAccentable()
                if let pick {
                    Text(pick.title).font(.headline).lineLimit(2)
                    Text("\(pick.minutes) min · \(pick.kind)").font(.caption)
                } else {
                    Text("Open OffHours to get tonight's pick").font(.caption)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        case .systemMedium:
            HStack(alignment: .top, spacing: 16) {
                main
                Spacer(minLength: 0)
                VStack(alignment: .trailing, spacing: 10) {
                    stat(value: "\(streak)", label: "day streak", symbol: "flame.fill")
                    stat(value: weekText, label: "this week", symbol: "clock")
                }
            }
            .foregroundStyle(.white)
        default:
            main.foregroundStyle(.white)
        }
    }

    private var main: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(isDone ? "DONE TONIGHT" : "TONIGHT")
                .font(.caption2.weight(.bold))
                .tracking(1.2)
                .opacity(0.8)
            if let pick {
                Image(systemName: isDone ? "checkmark.seal.fill" : pick.symbol)
                    .font(.title3)
                Spacer(minLength: 0)
                Text(isDone ? (entry.snapshot?.doneToday ?? pick.title) : pick.title)
                    .font(.system(.headline, design: .serif))
                    .lineLimit(3)
                    .minimumScaleFactor(0.85)
                if !isDone {
                    Text("\(pick.minutes) min")
                        .font(.caption)
                        .opacity(0.85)
                }
            } else {
                Spacer(minLength: 0)
                Text("Open OffHours to get tonight's pick.")
                    .font(.subheadline)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private var weekText: String {
        let minutes = entry.snapshot?.weekMinutes ?? 0
        return minutes >= 60 ? "\(minutes / 60)h \(minutes % 60)m" : "\(minutes)m"
    }

    private func stat(value: String, label: String, symbol: String) -> some View {
        VStack(alignment: .trailing, spacing: 0) {
            Label(value, systemImage: symbol)
                .font(.title3.weight(.semibold))
            Text(label)
                .font(.caption2)
                .opacity(0.8)
        }
    }
}

#Preview(as: .systemSmall) {
    TonightWidget()
} timeline: {
    TonightEntry(date: .now, snapshot: .placeholder)
}

#Preview(as: .systemMedium) {
    TonightWidget()
} timeline: {
    TonightEntry(date: .now, snapshot: .placeholder)
}
