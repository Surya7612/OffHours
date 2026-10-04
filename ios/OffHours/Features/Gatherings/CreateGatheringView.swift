import CoreLocation
import SwiftUI

struct CreateGatheringView: View {
    let near: CLLocation?
    let onCreated: ([Gathering]) -> Void

    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var details = ""
    @State private var meetingNote = ""
    @State private var startsAt = CreateGatheringView.defaultStart()
    @State private var durationMinutes = 60
    @State private var capacity = 6
    @State private var repeatsWeekly = false
    @State private var weeks = 4
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
                    Toggle("Repeat weekly", isOn: $repeatsWeekly)
                        .disabled(maxWeeks < 2)
                    if repeatsWeekly && maxWeeks >= 2 {
                        Stepper("\(min(weeks, maxWeeks)) weeks", value: $weeks, in: 2...maxWeeks)
                    }
                } footer: {
                    if repeatsWeekly && maxWeeks >= 2 {
                        Text("Same time and place every \(startsAt.formatted(.dateTime.weekday(.wide))), last one \(lastDate.formatted(date: .abbreviated, time: .omitted)). People join each date separately.")
                    } else if maxWeeks < 2 {
                        Text("Repeating dates must fall within the next 30 days.")
                    }
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
        trimmedTitle.count >= 3 && trimmedTitle.databaseLength <= 80
            && details.databaseLength <= 500 && meetingNote.databaseLength <= 140
            && place != nil && agreedToRules
    }

    /// How many weekly dates fit before the 30-day limit on gatherings (up to 4).
    private var maxWeeks: Int {
        let limit = Date.now.addingTimeInterval(30 * 24 * 60 * 60 - 5 * 60)
        return (1...4).last { weekly(startsAt, offset: $0 - 1) <= limit } ?? 1
    }

    private var dates: [Date] {
        let count = repeatsWeekly ? min(weeks, maxWeeks) : 1
        return (0..<count).map { weekly(startsAt, offset: $0) }
    }

    private var lastDate: Date { dates.last ?? startsAt }

    private func weekly(_ date: Date, offset: Int) -> Date {
        Calendar.current.date(byAdding: .weekOfYear, value: offset, to: date) ?? date
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
            let dates = dates
            let seriesID = dates.count > 1 ? UUID() : nil
            let created = try await backend.create(dates.map { date in
                NewGathering(
                    title: trimmedTitle,
                    details: trimmedDetails,
                    meetingNote: trimmedNote,
                    seriesID: seriesID,
                    startsAt: date,
                    durationMinutes: durationMinutes,
                    placeName: place.name.clipped(to: 120),
                    placeAddress: place.address.clipped(to: 200),
                    lat: place.coordinate.latitude,
                    lng: place.coordinate.longitude,
                    capacity: capacity
                )
            })
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
