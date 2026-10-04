import SwiftUI

struct ProfileSetupView: View {
    private enum Step: Int, CaseIterable {
        case name, interests, rhythm
    }

    @Environment(AppModel.self) private var model
    @State private var step: Step = .name
    @State private var name = ""
    @State private var interests: Set<Interest> = []
    @State private var nudgeTime = Calendar.current.date(bySettingHour: 18, minute: 0, second: 0, of: .now) ?? .now
    @State private var radiusKm = 3
    @State private var gatheringAlerts = false
    @State private var isSaving = false
    @State private var errorMessage: String?
    @FocusState private var nameFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ProgressView(value: Double(step.rawValue + 1), total: Double(Step.allCases.count))
                    .tint(Theme.ember)
                    .padding(.horizontal)

                ScrollView {
                    Group {
                        switch step {
                        case .name: nameStep
                        case .interests: interestsStep
                        case .rhythm: rhythmStep
                        }
                    }
                    .padding(24)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .scrollDismissesKeyboard(.interactively)

                VStack(spacing: 10) {
                    if let errorMessage {
                        Text(errorMessage).font(.footnote).foregroundStyle(.red)
                    }
                    Button(action: next) {
                        if isSaving {
                            ProgressView().tint(.white)
                        } else {
                            Text(step == .rhythm ? "Start my evenings" : "Continue")
                        }
                    }
                    .buttonStyle(.primary)
                    .disabled(!canContinue || isSaving)
                }
                .padding(24)
            }
            .toolbar {
                if step != .name {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Back", systemImage: "chevron.left") {
                            withAnimation { step = Step(rawValue: step.rawValue - 1) ?? .name }
                        }
                    }
                }
            }
        }
        .onAppear {
            if name.isEmpty { name = model.nameFromApple }
            nameFocused = name.isEmpty
        }
    }

    private var nameStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            StepHeader(title: "What should we call you?", subtitle: "Your first name is shown to people when you host a gathering.")
            TextField("First name", text: $name)
                .font(.title2)
                .textContentType(.givenName)
                .submitLabel(.continue)
                .focused($nameFocused)
                .onSubmit(next)
                .padding()
                .background(.fill.tertiary, in: .rect(cornerRadius: 16))
        }
    }

    private var interestsStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            StepHeader(title: "What helps you unwind?", subtitle: "Pick a few. Your evening ideas will lean toward them.")
            FlowLayout(spacing: 10) {
                ForEach(Interest.allCases) { interest in
                    InterestChip(interest: interest, isSelected: interests.contains(interest)) {
                        if interests.contains(interest) {
                            interests.remove(interest)
                        } else {
                            interests.insert(interest)
                        }
                    }
                }
            }
        }
    }

    private var rhythmStep: some View {
        VStack(alignment: .leading, spacing: 28) {
            StepHeader(title: "When does your day end?", subtitle: "We'll send one gentle nudge at this time, and nothing else.")

            DatePicker("Nudge me at", selection: $nudgeTime, displayedComponents: .hourAndMinute)
                .datePickerStyle(.wheel)
                .labelsHidden()
                .frame(maxWidth: .infinity)

            VStack(alignment: .leading, spacing: 10) {
                Text("How far will you go?")
                    .font(.headline)
                Picker("Distance", selection: $radiusKm) {
                    ForEach(Profile.radiusOptions, id: \.self) { km in
                        Text("\(km) km").tag(km)
                    }
                }
                .pickerStyle(.segmented)
                Text("Used to find places and gatherings near you. Your exact location is never stored or shared.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .leading, spacing: 6) {
                Toggle("Tell me when neighbors host a gathering", isOn: $gatheringAlerts)
                    .font(.headline)
                    .tint(Theme.ember)
                Text("At most one alert a day. We'd keep an approximate location, rounded to about 1 km, while this is on.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var canContinue: Bool {
        switch step {
        case .name: !trimmedName.isEmpty && trimmedName.count <= 40
        case .interests: !interests.isEmpty
        case .rhythm: true
        }
    }

    private var trimmedName: String { name.trimmingCharacters(in: .whitespacesAndNewlines) }

    private func next() {
        guard canContinue else { return }
        if let following = Step(rawValue: step.rawValue + 1) {
            withAnimation { step = following }
            return
        }
        Task { await save() }
    }

    private func save() async {
        guard let userID = model.userID else { return }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        let time = Calendar.current.dateComponents([.hour, .minute], from: nudgeTime)
        let profile = Profile(
            id: userID,
            displayName: trimmedName,
            interests: Interest.allCases.filter(interests.contains).map(\.rawValue),
            nudgeHour: time.hour ?? 18,
            nudgeMinute: time.minute ?? 0,
            radiusKm: radiusKm
        )
        _ = await NotificationScheduler.requestPermission()
        await model.location.requestPermission()
        do {
            try await model.saveProfile(profile)
            if gatheringAlerts {
                try? await model.setGatheringAlerts(true)
            }
        } catch {
            errorMessage = error.userMessage
        }
    }
}

struct StepHeader: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(.title, design: .serif, weight: .semibold))
            Text(subtitle)
                .foregroundStyle(.secondary)
        }
    }
}
