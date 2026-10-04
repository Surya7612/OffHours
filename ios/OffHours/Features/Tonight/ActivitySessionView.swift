import ActivityKit
import SwiftUI
import UserNotifications

struct ActivitySession: Identifiable {
    let id = UUID()
    let activity: Activity
    let place: Place?
    let startedAt = Date.now

    var endsAt: Date { startedAt.addingTimeInterval(TimeInterval(activity.minutes * 60)) }
}

struct ActivitySessionView: View {
    let session: ActivitySession

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var finishedAt: Date?
    @State private var reflection = ""
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var confirmQuit = false

    private static let endNotificationID = "activity-session-end"

    var body: some View {
        ZStack {
            Theme.duskGradient.ignoresSafeArea()

            if let finishedAt {
                reflectionStep(finishedAt: finishedAt)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            } else {
                timerStep
                    .transition(.opacity)
            }
        }
        .foregroundStyle(.white)
        .task {
            LiveSession.start(
                title: session.activity.title,
                symbol: session.activity.kind.symbol,
                placeName: session.place?.name,
                startedAt: session.startedAt,
                endsAt: session.endsAt
            )
            await scheduleEndNotification()
        }
        .onDisappear { LiveSession.end() }
        .confirmationDialog("Stop without saving?", isPresented: $confirmQuit, titleVisibility: .visible) {
            Button("Stop without saving", role: .destructive) { close() }
        }
    }

    private var timerStep: some View {
        VStack(spacing: 28) {
            HStack {
                Button("Close", systemImage: "xmark") { confirmQuit = true }
                    .labelStyle(.iconOnly)
                    .font(.title3)
                    .padding(10)
                    .background(.white.opacity(0.15), in: .circle)
                Spacer()
            }

            Spacer()

            VStack(spacing: 8) {
                Text(session.activity.title)
                    .font(.system(.title, design: .serif, weight: .semibold))
                    .multilineTextAlignment(.center)
                if let place = session.place {
                    Label(place.name, systemImage: "mappin")
                        .font(.subheadline)
                        .opacity(0.85)
                }
            }

            TimelineView(.periodic(from: session.startedAt, by: 1)) { context in
                let remaining = max(0, session.endsAt.timeIntervalSince(context.date))
                let progress = 1 - remaining / TimeInterval(session.activity.minutes * 60)
                ZStack {
                    Circle()
                        .stroke(.white.opacity(0.18), lineWidth: 10)
                    Circle()
                        .trim(from: 0, to: progress)
                        .stroke(.white, style: StrokeStyle(lineWidth: 10, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                        .animation(.linear(duration: 1), value: progress)
                    VStack(spacing: 4) {
                        Text(Duration.seconds(remaining.rounded(.up)), format: .time(pattern: .minuteSecond))
                            .font(.system(size: 56, weight: .light, design: .rounded))
                            .monospacedDigit()
                            .contentTransition(.numericText(countsDown: true))
                        Text(remaining == 0 ? "Time's up" : "remaining")
                            .font(.subheadline)
                            .opacity(0.8)
                    }
                }
                .frame(width: 260, height: 260)
                .accessibilityElement(children: .combine)
            }

            if !session.activity.steps.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(session.activity.steps, id: \.self) { step in
                        Label(step, systemImage: "circle.fill")
                            .labelStyle(BulletLabelStyle())
                            .font(.subheadline)
                    }
                }
                .opacity(0.9)
            } else {
                Text(ActivityAuthorizationInfo().areActivitiesEnabled
                     ? "You can lock your phone. The timer stays on your Lock Screen."
                     : "You can lock your phone. We'll let you know when the time is up.")
                    .font(.subheadline)
                    .multilineTextAlignment(.center)
                    .opacity(0.85)
            }

            Spacer()

            Button("I'm done") {
                withAnimation(.smooth) { finishedAt = .now }
                cancelEndNotification()
                LiveSession.end()
            }
            .font(.headline)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .foregroundStyle(Theme.dusk)
            .background(.white, in: .capsule)
            .sensoryFeedback(.success, trigger: finishedAt)
        }
        .padding(24)
    }

    private func reflectionStep(finishedAt: Date) -> some View {
        VStack(alignment: .leading, spacing: 20) {
            Spacer()
            Image(systemName: "sparkles")
                .font(.system(size: 44))
            Text("Nice. How did that feel?")
                .font(.system(.largeTitle, design: .serif, weight: .semibold))
            Text("One line is plenty. It's only for you.")
                .opacity(0.85)

            TextField("I noticed…", text: $reflection, axis: .vertical)
                .lineLimit(3...6)
                .padding()
                .background(.white.opacity(0.15), in: .rect(cornerRadius: 16))
                .foregroundStyle(.white)
                .tint(.white)

            if let errorMessage {
                Text(errorMessage).font(.footnote)
            }

            Spacer()

            Button {
                Task { await save(finishedAt: finishedAt) }
            } label: {
                Group {
                    if isSaving { ProgressView().tint(Theme.dusk) } else { Text("Save to journal") }
                }
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .foregroundStyle(Theme.dusk)
                .background(.white, in: .capsule)
            }
            .disabled(isSaving)
        }
        .padding(24)
    }

    private func save(finishedAt: Date) async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        let minutes = Int((finishedAt.timeIntervalSince(session.startedAt) / 60).rounded())
        let text = reflection.trimmingCharacters(in: .whitespacesAndNewlines)
        do {
            try await model.complete(
                session.activity,
                minutes: min(max(minutes, 1), session.activity.minutes),
                place: session.place,
                reflection: text.isEmpty ? nil : String(text.prefix(1000))
            )
            dismiss()
        } catch {
            errorMessage = error.userMessage
        }
    }

    private func close() {
        cancelEndNotification()
        dismiss()
    }

    private func scheduleEndNotification() async {
        guard await NotificationScheduler.isAuthorized() else { return }
        let content = UNMutableNotificationContent()
        content.title = "Time's up"
        content.body = "Come back to OffHours to wrap up \(session.activity.title.lowercased())."
        content.sound = .default
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(1, session.endsAt.timeIntervalSinceNow), repeats: false)
        try? await UNUserNotificationCenter.current().add(
            UNNotificationRequest(identifier: Self.endNotificationID, content: content, trigger: trigger)
        )
    }

    private func cancelEndNotification() {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [Self.endNotificationID])
    }
}

private struct BulletLabelStyle: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            configuration.icon
                .font(.system(size: 5))
                .alignmentGuide(.firstTextBaseline) { $0[VerticalAlignment.center] + 4 }
            configuration.title
        }
    }
}
