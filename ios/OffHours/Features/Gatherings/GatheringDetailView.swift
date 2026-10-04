import MapKit
import SwiftUI

struct GatheringDetailView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    @State var gathering: Gathering
    let model: GatheringsModel

    @State private var isWorking = false
    @State private var errorMessage: String?
    @State private var showReport = false
    @State private var confirmBlock = false
    @State private var confirmCancel = false
    @State private var attendees: [Attendee] = []
    @State private var editingSpot = false
    @State private var spotDraft = ""

    private var isHost: Bool { gathering.hostID == app.userID }

    private var shareText: String {
        let day = gathering.startsAt.formatted(.dateTime.weekday(.wide).month().day())
        let time = gathering.startsAt.formatted(date: .omitted, time: .shortened)
        var lines = ["Join me for \(gathering.title): \(day) at \(time), \(gathering.placeName)."]
        if let spot = gathering.meetingSpot { lines.append("Look for: \(spot)") }
        lines.append("RSVP on OffHours: \(AppConfig.downloadURL.absoluteString)")
        return lines.joined(separator: "\n")
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Map(initialPosition: .region(MKCoordinateRegion(
                    center: gathering.coordinate,
                    latitudinalMeters: 800,
                    longitudinalMeters: 800
                ))) {
                    Marker(gathering.placeName, systemImage: "person.3.fill", coordinate: gathering.coordinate)
                        .tint(Theme.ember)
                }
                .frame(height: 200)
                .clipShape(.rect(cornerRadius: 20))
                .allowsHitTesting(false)

                VStack(alignment: .leading, spacing: 8) {
                    Text(gathering.title)
                        .font(.system(.title, design: .serif, weight: .semibold))
                    Text("Hosted by \(isHost ? "you" : gathering.hostName)")
                        .foregroundStyle(.secondary)
                }

                VStack(alignment: .leading, spacing: 14) {
                    InfoRow(symbol: "calendar") {
                        Text(gathering.startsAt, format: .dateTime.weekday(.wide).month().day())
                        Text("\(gathering.startsAt.formatted(date: .omitted, time: .shortened)) – \(gathering.endsAt.formatted(date: .omitted, time: .shortened))")
                            .foregroundStyle(.secondary)
                    }
                    Button {
                        Place(name: gathering.placeName, address: gathering.placeAddress, coordinate: gathering.coordinate).openInMaps()
                    } label: {
                        InfoRow(symbol: "mappin.and.ellipse") {
                            Text(gathering.placeName)
                            if !gathering.placeAddress.isEmpty {
                                Text(gathering.placeAddress).foregroundStyle(.secondary)
                            }
                            Text("Get directions").font(.subheadline.weight(.medium)).foregroundStyle(Theme.ember)
                        }
                    }
                    .buttonStyle(.plain)
                    InfoRow(symbol: "person.2") {
                        Text("\(gathering.attendeeCount) going")
                        Text(gathering.isFull ? "No spots left" : "\(gathering.spotsLeft) of \(gathering.capacity) spots left")
                            .foregroundStyle(.secondary)
                    }
                    if gathering.meetingSpot != nil || isHost {
                        InfoRow(symbol: "eye") {
                            Text(gathering.meetingSpot ?? "Add where to find you")
                                .foregroundStyle(gathering.meetingSpot == nil ? .secondary : .primary)
                            if isHost {
                                Button(gathering.meetingSpot == nil ? "Add meeting spot" : "Change meeting spot") {
                                    spotDraft = gathering.meetingNote ?? ""
                                    editingSpot = true
                                }
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(Theme.ember)
                            }
                        }
                    }
                }
                .card()

                if isHost {
                    attendeeList
                }

                if !gathering.details.isEmpty {
                    Text(gathering.details)
                        .card()
                }

                Label("Meet in public, tell someone where you're going, and leave if anything feels off.", systemImage: "shield.lefthalf.filled")
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                if let errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }

                actionButton
            }
            .padding(20)
        }
        .background(Color(.systemGroupedBackground))
        .navigationBarTitleDisplayMode(.inline)
        .task {
            guard isHost, let backend = app.backend else { return }
            attendees = (try? await backend.attendees(gatheringID: gathering.id)) ?? []
        }
        .alert("Meeting spot", isPresented: $editingSpot) {
            TextField("By the fountain, red umbrella", text: $spotDraft)
            Button("Save") { saveSpot() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Help people find you when they arrive.")
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                ShareLink(item: shareText) {
                    Label("Share", systemImage: "square.and.arrow.up")
                }
            }
            if !isHost {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu("More", systemImage: "ellipsis.circle") {
                        Button("Report gathering", systemImage: "flag") { showReport = true }
                        Button("Block \(gathering.hostName)", systemImage: "hand.raised", role: .destructive) { confirmBlock = true }
                    }
                }
            }
        }
        .sheet(isPresented: $showReport) {
            ReportSheet { reason in
                try await model.report(gathering, reason: reason, app: app)
                dismiss()
            }
        }
        .confirmationDialog("Block \(gathering.hostName)?", isPresented: $confirmBlock, titleVisibility: .visible) {
            Button("Block", role: .destructive) {
                perform {
                    try await model.blockHost(of: gathering, app: app)
                    dismiss()
                }
            }
        } message: {
            Text("You won't see their gatherings, and they can't join yours.")
        }
        .confirmationDialog("Cancel this gathering?", isPresented: $confirmCancel, titleVisibility: .visible) {
            Button("Cancel gathering", role: .destructive) {
                perform {
                    try await model.cancel(gathering, app: app)
                    dismiss()
                }
            }
            Button("Keep it", role: .cancel) {}
        } message: {
            Text("It will disappear for everyone who joined.")
        }
    }

    private var attendeeList: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Who's coming")
                .font(.headline)
            if attendees.isEmpty {
                Text("No one yet. Share it with friends to get it started.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(attendees) { attendee in
                    HStack {
                        Text(attendee.displayName)
                        Spacer()
                        Text(attendee.joinedAt, format: .relative(presentation: .named))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }

    private func saveSpot() {
        let note = String(spotDraft.trimmingCharacters(in: .whitespacesAndNewlines).prefix(140))
        if let problem = ContentFilter.problem(in: note) {
            errorMessage = problem
            return
        }
        perform {
            try await model.updateMeetingNote(note, for: gathering, app: app)
            gathering.meetingNote = note
        }
    }

    @ViewBuilder
    private var actionButton: some View {
        if isHost {
            Button("Cancel gathering", role: .destructive) { confirmCancel = true }
                .frame(maxWidth: .infinity)
                .buttonStyle(.bordered)
                .controlSize(.large)
        } else if gathering.going {
            Button("I can't make it") {
                perform {
                    try await model.leave(gathering, app: app)
                    gathering.isGoing = false
                    gathering.attendeeCount = max(0, gathering.attendeeCount - 1)
                }
            }
            .frame(maxWidth: .infinity)
            .buttonStyle(.bordered)
            .controlSize(.large)
            .disabled(isWorking)
        } else {
            Button {
                perform {
                    try await model.join(gathering, app: app)
                    gathering.isGoing = true
                    gathering.attendeeCount += 1
                }
            } label: {
                if isWorking { ProgressView().tint(.white) } else { Text(gathering.isFull ? "Full" : "I'm going") }
            }
            .buttonStyle(.primary)
            .disabled(gathering.isFull || isWorking)
            .sensoryFeedback(.success, trigger: gathering.going)
        }
    }

    private func perform(_ work: @escaping @MainActor () async throws -> Void) {
        isWorking = true
        errorMessage = nil
        Task {
            defer { isWorking = false }
            do {
                try await work()
            } catch {
                errorMessage = error.userMessage
            }
        }
    }
}

private struct InfoRow<Content: View>: View {
    let symbol: String
    @ViewBuilder let content: Content

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: symbol)
                .font(.title3)
                .foregroundStyle(Theme.ember)
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 2) { content }
            Spacer(minLength: 0)
        }
    }
}

private struct ReportSheet: View {
    let onSubmit: (String) async throws -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var reason = Reason.inappropriate
    @State private var details = ""
    @State private var isSending = false
    @State private var errorMessage: String?

    enum Reason: String, CaseIterable, Identifiable {
        case inappropriate = "Offensive or inappropriate"
        case unsafe = "Feels unsafe"
        case spam = "Spam or advertising"
        case fake = "Fake or misleading"
        case other = "Something else"
        var id: String { rawValue }
    }

    var body: some View {
        NavigationStack {
            Form {
                Picker("Reason", selection: $reason) {
                    ForEach(Reason.allCases) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.inline)
                Section("Details (optional)") {
                    TextField("What happened?", text: $details, axis: .vertical)
                        .lineLimit(3...6)
                }
                Section {
                    Text("We review every report within 24 hours and remove content that breaks the rules.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }
            }
            .navigationTitle("Report")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Send") { send() }
                        .disabled(isSending)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func send() {
        isSending = true
        let text = details.trimmingCharacters(in: .whitespacesAndNewlines)
        let full = text.isEmpty ? reason.rawValue : "\(reason.rawValue): \(text)"
        Task {
            defer { isSending = false }
            do {
                try await onSubmit(String(full.prefix(500)))
                dismiss()
            } catch {
                errorMessage = error.userMessage
            }
        }
    }
}
