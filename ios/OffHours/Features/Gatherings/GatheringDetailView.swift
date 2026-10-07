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
    @State private var otherDates: [Gathering] = []
    @State private var didReport = false
    @State private var calendarSaved = false
    @State private var isSavingCalendar = false
    @State private var calendarMessage: String?
    @State private var calendarNeedsSettings = false
    @State private var announcements: [GatheringAnnouncement] = []
    @State private var announcementDraft = ""
    @State private var hostedCount = 0
    @State private var ageMessage: String?

    private var isHost: Bool { gathering.hostID == app.userID }

    private var shareText: String {
        let day = gathering.startsAt.formatted(.dateTime.weekday(.wide).month().day())
        let time = gathering.startsAt.formatted(date: .omitted, time: .shortened)
        var lines = ["Join me for \(gathering.title): \(day) at \(time), \(gathering.placeName)."]
        if let spot = gathering.meetingSpot { lines.append("Look for: \(spot)") }
        if gathering.isPrivate == true, let code = gathering.inviteCode {
            lines.append("This is invite only. In OffHours, choose Invite code and enter \(code).")
        }
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
                    if hostedCount > 0 {
                        Text(hostedCount == 1 ? "Hosted 1 gathering" : "Hosted \(hostedCount) gatherings")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    if gathering.seriesID != nil {
                        Tag(text: "Repeats weekly", color: Theme.ember)
                    }
                    if gathering.isPrivate == true {
                        Tag(text: gathering.inviteCode.map { "Invite code \($0)" } ?? "Invite only", color: Theme.ember)
                    }
                }

                VStack(alignment: .leading, spacing: 14) {
                    InfoRow(symbol: "calendar") {
                        Text(gathering.startsAt, format: .dateTime.weekday(.wide).month().day())
                        Text("\(gathering.startsAt.formatted(date: .omitted, time: .shortened)) – \(gathering.endsAt.formatted(date: .omitted, time: .shortened))")
                            .foregroundStyle(.secondary)
                        if let closes = gathering.rsvpClosesAt {
                            Text(gathering.rsvpClosed ? "RSVPs are closed" : "RSVPs close \(closes.formatted(.dateTime.weekday(.abbreviated).hour().minute()))")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        Button(calendarSaved ? "On your calendar" : "Add to Calendar", systemImage: "calendar.badge.plus") {
                            Task { await addToCalendar() }
                        }
                        .disabled(calendarSaved || isSavingCalendar)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(Theme.ember)
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

                if !otherDates.isEmpty {
                    otherDatesList
                }

                if !gathering.details.isEmpty {
                    Text(gathering.details)
                        .card()
                }

                if isHost || !announcements.isEmpty {
                    updates
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
            guard let backend = app.backend else { return }
            if let seriesID = gathering.seriesID {
                let dates = (try? await backend.seriesDates(seriesID: seriesID)) ?? []
                otherDates = dates.filter { $0.id != gathering.id && !$0.hasEnded }
            }
            if isHost {
                attendees = (try? await backend.attendees(gatheringID: gathering.id)) ?? []
            }
            announcements = (try? await backend.announcements(gatheringID: gathering.id)) ?? []
            hostedCount = (try? await backend.hostedCount(hostID: gathering.hostID)) ?? 0
        }
        .alert("Calendar", isPresented: Binding(
            get: { calendarMessage != nil },
            set: { if !$0 { calendarMessage = nil } }
        )) {
            if calendarNeedsSettings {
                Button("Open Settings") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
            }
            Button("OK", role: .cancel) {}
        } message: {
            Text(calendarMessage ?? "")
        }
        .alert("Gatherings", isPresented: Binding(
            get: { ageMessage != nil },
            set: { if !$0 { ageMessage = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(ageMessage ?? "")
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
        .sheet(isPresented: $showReport, onDismiss: {
            if didReport { dismiss() }
        }) {
            ReportSheet { reason in
                try await model.report(gathering, reason: reason, app: app)
                didReport = true
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
            Button(otherDates.isEmpty ? "Cancel gathering" : "Cancel this date", role: .destructive) {
                perform {
                    try await model.cancel(gathering, app: app)
                    dismiss()
                }
            }
            if !otherDates.isEmpty {
                Button("Cancel all upcoming dates", role: .destructive) {
                    perform {
                        try await model.cancelSeries(of: gathering, app: app)
                        dismiss()
                    }
                }
            }
            Button("Keep it", role: .cancel) {}
        } message: {
            Text("Everyone who joined will be told it's off.")
        }
    }

    private var otherDatesList: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Other dates")
                .font(.headline)
            ForEach(otherDates) { date in
                Button {
                    app.openGathering(date.id)
                } label: {
                    HStack {
                        Text(date.startsAt, format: .dateTime.weekday(.wide).month().day().hour().minute())
                        Spacer()
                        Text(date.isFull ? "Full" : "\(date.spotsLeft) left")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Image(systemName: "chevron.right")
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(.tertiary)
                    }
                    .contentShape(.rect)
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
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
                        if let status = attendee.statusLabel {
                            Text(status)
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(Theme.ember)
                        }
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

    private func addToCalendar() async {
        guard !isSavingCalendar else { return }
        isSavingCalendar = true
        defer { isSavingCalendar = false }
        var notes = [gathering.details]
        if let spot = gathering.meetingSpot { notes.append("Look for: \(spot)") }
        notes.append("From OffHours")
        let outcome = await CalendarPlanner.save(
            title: gathering.title,
            start: gathering.startsAt,
            minutes: gathering.durationMinutes,
            location: gathering.placeName,
            notes: notes.filter { !$0.isEmpty }.joined(separator: "\n")
        )
        switch outcome {
        case .saved:
            calendarSaved = true
        case .denied:
            calendarNeedsSettings = true
            calendarMessage = "OffHours can add this gathering once Calendar access is on."
        case .failed:
            calendarNeedsSettings = false
            calendarMessage = "Couldn't add that to your calendar."
        }
    }

    private func saveSpot() {
        let note = spotDraft.trimmingCharacters(in: .whitespacesAndNewlines).clipped(to: 140)
        if let problem = ContentFilter.problem(in: note) {
            errorMessage = problem
            return
        }
        perform {
            try await model.updateMeetingNote(note, for: gathering, app: app)
            gathering.meetingNote = note
        }
    }

    private var updates: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("From the host")
                .font(.headline)
            if announcements.isEmpty {
                Text("No updates yet.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(announcements) { note in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(note.body)
                        Text(note.createdAt, format: .dateTime.weekday(.abbreviated).hour().minute())
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            if isHost && !gathering.hasEnded {
                TextField("Running a few minutes late", text: $announcementDraft, axis: .vertical)
                    .lineLimit(2...4)
                Button("Post update") { postUpdate() }
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Theme.ember)
                    .disabled(announcementDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }

    @ViewBuilder
    private var actionButton: some View {
        if isHost {
            Button("Cancel gathering", role: .destructive) { confirmCancel = true }
                .frame(maxWidth: .infinity)
                .buttonStyle(.bordered)
                .controlSize(.large)
        } else if gathering.going {
            VStack(spacing: 10) {
                if gathering.canArrive() {
                    Button("I'm here") {
                        perform {
                            try await app.backend?.arrive(gatheringID: gathering.id)
                            gathering.arrivedAt = .now
                        }
                    }
                    .buttonStyle(.primary)
                    .disabled(isWorking)
                } else if gathering.canConfirm() {
                    Button("I'll be there") {
                        perform {
                            try await app.backend?.confirm(gatheringID: gathering.id)
                            gathering.confirmedAt = .now
                        }
                    }
                    .buttonStyle(.primary)
                    .disabled(isWorking)
                }
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
            }
        } else if gathering.rsvpClosed {
            Button("RSVPs are closed") {}
                .buttonStyle(.primary)
                .disabled(true)
        } else if gathering.isFull {
            if gathering.waiting {
                Button("Leave the waitlist") { Task { await waitlist() } }
                    .buttonStyle(.bordered)
                    .disabled(isWorking)
            } else {
                Button("Join the waitlist") { Task { await waitlist() } }
                    .buttonStyle(.primary)
                    .disabled(isWorking)
            }
        } else {
            Button {
                Task { await join() }
            } label: {
                if isWorking { ProgressView().tint(.white) } else { Text("I'm going") }
            }
            .buttonStyle(.primary)
            .disabled(isWorking)
            .sensoryFeedback(.success, trigger: gathering.going)
        }
    }

    private func join() async {
        if let reason = await GatheringAge.blockReason() {
            ageMessage = reason
            return
        }
        perform {
            try await model.join(gathering, app: app)
            gathering.isGoing = true
            gathering.isWaiting = false
            gathering.attendeeCount += 1
        }
    }

    private func waitlist() async {
        if gathering.waiting {
            perform {
                guard let userID = app.userID else { return }
                try await app.backend?.leaveWaitlist(gatheringID: gathering.id, userID: userID)
                gathering.isWaiting = false
            }
            return
        }
        if let reason = await GatheringAge.blockReason() {
            ageMessage = reason
            return
        }
        perform {
            try await app.backend?.joinWaitlist(gatheringID: gathering.id)
            gathering.isWaiting = true
        }
    }

    private func postUpdate() {
        let body = announcementDraft.trimmingCharacters(in: .whitespacesAndNewlines).clipped(to: 280)
        guard !body.isEmpty else { return }
        if let problem = ContentFilter.problem(in: body) {
            errorMessage = problem
            return
        }
        perform {
            let note = try await app.backend?.postAnnouncement(gatheringID: gathering.id, body: body)
            if let note { announcements.append(note) }
            announcementDraft = ""
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
                try await onSubmit(full.clipped(to: 500))
                dismiss()
            } catch {
                errorMessage = error.userMessage
            }
        }
    }
}
