import ActivityKit
import SwiftUI
import WidgetKit

/// The running activity timer on the Lock Screen and in the Dynamic Island.
struct SessionLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SessionActivityAttributes.self) { context in
            HStack(spacing: 16) {
                Image(systemName: context.attributes.symbol)
                    .font(.title2)
                    .frame(width: 44, height: 44)
                    .background(.white.opacity(0.18), in: .circle)
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.attributes.title)
                        .font(.headline)
                        .lineLimit(1)
                    Text(context.attributes.placeName ?? "Phone down. Enjoy it.")
                        .font(.subheadline)
                        .opacity(0.85)
                        .lineLimit(1)
                }
                Spacer(minLength: 8)
                remaining(context)
                    .font(.system(.title, design: .rounded, weight: .semibold))
            }
            .foregroundStyle(.white)
            .padding(18)
            .activityBackgroundTint(WidgetTheme.dusk)
            .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: context.attributes.symbol)
                        .font(.title2)
                        .foregroundStyle(WidgetTheme.ember)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    remaining(context)
                        .font(.system(.title2, design: .rounded, weight: .semibold))
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.attributes.title)
                        .font(.headline)
                        .lineLimit(1)
                }
            } compactLeading: {
                Image(systemName: context.attributes.symbol)
                    .foregroundStyle(WidgetTheme.ember)
            } compactTrailing: {
                remaining(context)
                    .frame(maxWidth: 52)
            } minimal: {
                Image(systemName: context.attributes.symbol)
                    .foregroundStyle(WidgetTheme.ember)
            }
        }
    }

    private func remaining(_ context: ActivityViewContext<SessionActivityAttributes>) -> some View {
        Text(timerInterval: context.attributes.startedAt...context.state.endsAt, countsDown: true)
            .monospacedDigit()
            .multilineTextAlignment(.trailing)
    }
}
