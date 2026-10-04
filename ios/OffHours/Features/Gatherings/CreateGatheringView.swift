import CoreLocation
import SwiftUI

struct CreateGatheringView: View {
    let near: CLLocation?
    let onCreated: (Gathering) -> Void

    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var details = ""
    @State private var meetingNote = ""
    @State private var startsAt = CreateGatheringView.defaultStart()
    @State private var durationMinutes = 60
    @State private var capacity = 6
    @State private var place: Place?
    @State private var showPlaceSearch = false
    @State private var agreedToRules = false
    @State private var isSaving = false
    @State private var errorMessage: String?

    private static let durations = [30, 45, 60, 90, 120]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Sunset walk along the river", text: $title)
                    TextField("What's the plan? Who is it for?", text: $details, axis: .vertical)
                        .lineLimit(3...6)
                } footer: {
                    Text("Keep it simple and phone-free. Gatherings are visible to people within a few kilometers.")
                }

                Section {
                    Button {
                        showPlaceSearch = true
                    } label: {
                        HStack {
                            Label {
                                if let place {
                                    VStack(alignment: .leading) {
                                        Text(place.name).foregroundStyle(.primary)
                                        if !place.address.isEmpty {
                                            Text(place.address).font(.footnote).foregroundStyle(.secondary)
                                        }
                                    }
                                } else {
                                    Text("Choose a public place")
                                }
                            } icon: {
                                Image(systemName: "mappin.and.ellipse")
                            }
                            Spacer()
                            Image(systemName: "chevron.right").font(.footnote).foregroundStyle(.tertiary)
                        }
                    }

                    TextField("Where exactly? (by the fountain, red umbrella)", text: $meetingNote)

                    DatePicker("Starts", selection: $startsAt, in: Date.now.addingTimeInterval(30 * 60)...Date.now.addingTimeInterval(30 * 24 * 60 * 60), displayedComponents: [.date, .hourAndMinute])

                    Picker("Length", selection: $durationMinutes) {
                        ForEach(Self.durations, id: \.self) { minutes in
                            Text(Duration.seconds(minutes * 60), format: .units(allowed: [.hours, .minutes], width: .abbreviated))
                                .tag(minutes)
                        }
                    }

                    Stepper("Up to \(capacity) people", value: $capacity, in: 2...20)
                }

                Section {
                    Toggle(isOn: $agreedToRules) {
                        Text("I'll meet in a public place and follow the [community rules](\(AppConfig.termsURL.absoluteString)).")
                            .font(.subheadline)
                    }
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage).foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Host a gathering")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if isSaving {
                        ProgressView()
                    } else {
                        Button("Post") { Task { await post() } }
                            .disabled(!canPost)
                    }
                }
            }
            .sheet(isPresented: $showPlaceSearch) {
                PlaceSearchView(near: near) { chosen in
                    place = chosen
                }
            }
        }
        .interactiveDismissDisabled(!title.isEmpty || place != nil)
    }

    private var trimmedTitle: String { title.trimmingCharacters(in: .whitespacesAndNewlines) }

    private var canPost: Bool {
        (3...80).contains(trimmedTitle.count) && details.count <= 500 && meetingNote.count <= 140
            && place != nil && agreedToRules
    }

    private func post() async {
        guard let backend = app.backend, let place else { return }
        let trimmedDetails = details.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedNote = meetingNote.trimmingCharacters(in: .whitespacesAndNewlines)
        if let problem = ContentFilter.problem(in: [trimmedTitle, trimmedDetails, trimmedNote].joined(separator: " ")) {
            errorMessage = problem
            return
        }
        guard startsAt > .now.addingTimeInterval(10 * 60) else {
            errorMessage = "Pick a start time at least a few minutes from now."
            return
        }

        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            let created = try await backend.create(NewGathering(
                title: trimmedTitle,
                details: trimmedDetails,
                meetingNote: trimmedNote,
                startsAt: startsAt,
                durationMinutes: durationMinutes,
                placeName: String(place.name.prefix(120)),
                placeAddress: String(place.address.prefix(200)),
                lat: place.coordinate.latitude,
                lng: place.coordinate.longitude,
                capacity: capacity
            ))
            onCreated(created)
            dismiss()
        } catch {
            errorMessage = error.userMessage
        }
    }

    private static func defaultStart() -> Date {
        let calendar = Calendar.current
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: .now) ?? .now
        return calendar.date(bySettingHour: 18, minute: 30, second: 0, of: tomorrow) ?? tomorrow
    }
}
