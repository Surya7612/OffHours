import AuthenticationServices
import SwiftUI

struct SettingsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    @State private var name = ""
    @State private var interests: Set<Interest> = []
    @State private var nudgeTime = Date.now
    @State private var radiusKm = 3
    @State private var notificationsOn = true
    @State private var preferences = EveningPreferences()
    @State private var isSaving = false
    @State private var confirmSignOut = false
    @State private var confirmDelete = false
    @State private var confirmWithApple = false
    @State private var isDeleting = false
    @State private var isTogglingAlerts = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("You") {
                    TextField("First name", text: $name)
                        .textContentType(.givenName)
                }

                Section {
                    DatePicker("Daily nudge", selection: $nudgeTime, displayedComponents: .hourAndMinute)
                    Picker("Distance", selection: $radiusKm) {
                        ForEach(Profile.radiusOptions, id: \.self) { Text("\($0) km").tag($0) }
                    }
                    if !notificationsOn {
                        Button("Turn on notifications in Settings") { openSystemSettings() }
                    }
                } header: {
                    Text("Evenings")
                } footer: {
                    Text("One notification a day at this time, plus reminders an hour before gatherings you join.")
                }

                Section {
                    Toggle(isOn: Binding(
                        get: { model.profile?.gatheringAlerts ?? false },
                        set: { enabled in Task { await setAlerts(enabled) } }
                    )) {
                        Text("New gatherings near me")
                    }
                    .disabled(isTogglingAlerts)
                } header: {
                    Text("Gatherings")
                } footer: {
                    Text("At most one alert a day when someone hosts within your distance. We keep an approximate location, rounded to about 1 km, only while this is on. Hosts are always told when someone joins.")
                }

                Section {
                    Toggle("Quieter evenings", isOn: $preferences.quieter)
                    Toggle("Stay close to home", isOn: $preferences.stayClose)
                    Toggle("Prefer indoor", isOn: $preferences.preferIndoor)
                    Toggle("Keep it free", isOn: $preferences.keepFree)
                } header: {
                    Text("What usually fits")
                } footer: {
                    Text("These stay on this iPhone and shape Tonight until you change them. Tonight's check-in still applies for today.")
                }

                Section("Interests") {
                    FlowLayout(spacing: 8) {
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
                    .padding(.vertical, 6)
                }

                if let problem = WeatherProvider.lastProblem {
                    Section("Weather") {
                        Text(problem)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                Section("About") {
                    Link("Privacy Policy", destination: AppConfig.privacyPolicyURL)
                    Link("Terms & Community Rules", destination: AppConfig.termsURL)
                    Button("Contact support") {
                        if let url = URL(string: "mailto:\(AppConfig.supportEmail)") { openURL(url) }
                    }
                }

                Section {
                    Button("Sign out") { confirmSignOut = true }
                    Button("Delete account", role: .destructive) { confirmDelete = true }
                        .disabled(isDeleting)
                } footer: {
                    if isDeleting {
                        Text("Deleting your account…")
                    } else {
                        Text("Deleting your account permanently removes your profile, journal, gatherings and RSVPs.")
                    }
                }

                if let errorMessage {
                    Section { Text(errorMessage).foregroundStyle(.red) }
                }

                Section {
                    Text("OffHours \(Bundle.main.versionString)")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                        .listRowBackground(Color.clear)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if isSaving {
                        ProgressView()
                    } else {
                        Button("Save") { Task { await save() } }
                            .disabled(!hasChanges || !isValid)
                    }
                }
            }
            .onAppear(perform: loadFromProfile)
            .onChange(of: preferences) { _, updated in
                guard let userID = model.userID else { return }
                EveningPreferencesStore.save(updated, for: userID)
            }
            .task { notificationsOn = await NotificationScheduler.isAuthorized() }
            .confirmationDialog("Sign out of OffHours?", isPresented: $confirmSignOut, titleVisibility: .visible) {
                Button("Sign out", role: .destructive) {
                    Task {
                        await model.signOut()
                        dismiss()
                    }
                }
            }
            .confirmationDialog("Delete your account?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Continue", role: .destructive) { confirmWithApple = true }
            } message: {
                Text("This can't be undone.")
            }
            .sheet(isPresented: $confirmWithApple) {
                DeleteAccountConfirmation { code in
                    confirmWithApple = false
                    Task { await deleteAccount(appleAuthorizationCode: code) }
                }
                .presentationDetents([.medium])
            }
        }
    }

    private var draft: Profile? {
        guard let profile = model.profile else { return nil }
        let time = Calendar.current.dateComponents([.hour, .minute], from: nudgeTime)
        var updated = profile
        updated.displayName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        updated.interests = Interest.allCases.filter(interests.contains).map(\.rawValue)
        updated.nudgeHour = time.hour ?? profile.nudgeHour
        updated.nudgeMinute = time.minute ?? profile.nudgeMinute
        updated.radiusKm = radiusKm
        return updated
    }

    private var hasChanges: Bool { draft != model.profile }

    private var isValid: Bool {
        guard let draft else { return false }
        return !draft.displayName.isEmpty && draft.displayName.count <= 40 && !draft.interests.isEmpty
    }

    private func loadFromProfile() {
        guard let profile = model.profile else { return }
        name = profile.displayName
        interests = Set(profile.interests.compactMap(Interest.init(rawValue:)))
        nudgeTime = Calendar.current.date(bySettingHour: profile.nudgeHour, minute: profile.nudgeMinute, second: 0, of: .now) ?? .now
        radiusKm = profile.radiusKm
        if let userID = model.userID {
            preferences = EveningPreferencesStore.load(for: userID)
        }
    }

    private func save() async {
        guard let draft else { return }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            try await model.saveProfile(draft)
            dismiss()
        } catch {
            errorMessage = error.userMessage
        }
    }

    private func setAlerts(_ enabled: Bool) async {
        isTogglingAlerts = true
        errorMessage = nil
        defer { isTogglingAlerts = false }
        do {
            try await model.setGatheringAlerts(enabled)
        } catch {
            errorMessage = error.userMessage
        }
    }

    private func deleteAccount(appleAuthorizationCode: String) async {
        isDeleting = true
        errorMessage = nil
        defer { isDeleting = false }
        do {
            try await model.deleteAccount(appleAuthorizationCode: appleAuthorizationCode)
            dismiss()
        } catch {
            errorMessage = error.userMessage
        }
    }

    private func openSystemSettings() {
        if let url = URL(string: UIApplication.openNotificationSettingsURLString) {
            openURL(url)
        }
    }
}

/// Asks the person to confirm with Apple, which also gives the server a code to revoke the
/// app's Sign in with Apple access.
private struct DeleteAccountConfirmation: View {
    let onConfirmed: (String) -> Void
    @Environment(\.colorScheme) private var colorScheme
    @State private var errorMessage: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Confirm it's you")
                .font(.system(.title2, design: .serif, weight: .semibold))
            Text("Your profile, journal, gatherings and RSVPs will be deleted, and OffHours will be removed from the apps using your Apple ID.")
                .foregroundStyle(.secondary)
            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(.red)
            }
            Spacer()
            SignInWithAppleButton(.continue) { request in
                request.requestedScopes = []
            } onCompletion: { result in
                switch result {
                case .success(let authorization):
                    guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                          let data = credential.authorizationCode,
                          let code = String(data: data, encoding: .utf8) else {
                        errorMessage = "Apple didn't confirm your account. Please try again."
                        return
                    }
                    onConfirmed(code)
                case .failure(let error):
                    if (error as? ASAuthorizationError)?.code != .canceled {
                        errorMessage = error.localizedDescription
                    }
                }
            }
            .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
            .frame(height: 50)
        }
        .padding(24)
    }
}

extension Bundle {
    var versionString: String {
        let version = object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0"
        let build = object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "1"
        return "\(version) (\(build))"
    }
}
