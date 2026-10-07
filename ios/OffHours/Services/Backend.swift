import Foundation
import Supabase

/// All reads and writes to Supabase. Row level security on the server is what actually
/// restricts access; these calls never pass a user ID the server would trust.
struct Backend: Sendable {
    let client: SupabaseClient

    static let shared: Backend? = {
        guard let url = AppConfig.supabaseURL, let key = AppConfig.supabaseKey else { return nil }
        let client = SupabaseClient(
            supabaseURL: url,
            supabaseKey: key,
            options: SupabaseClientOptions(auth: .init(emitLocalSessionAsInitialSession: true))
        )
        return Backend(client: client)
    }()

    // MARK: Auth

    func signInWithApple(idToken: String, nonce: String) async throws {
        _ = try await client.auth.signInWithIdToken(
            credentials: .init(provider: .apple, idToken: idToken, nonce: nonce)
        )
    }

    /// Signs out on this device only, so someone's other devices stay signed in.
    func signOut() async throws {
        try await client.auth.signOut(scope: .local)
    }

    /// The authorization code comes from a fresh Sign in with Apple prompt, so the server can
    /// revoke the app's access to the Apple ID before deleting the account.
    func deleteAccount(appleAuthorizationCode: String?) async throws {
        struct Payload: Encodable { let authorization_code: String? }
        try await client.functions.invoke(
            "delete-account",
            options: FunctionInvokeOptions(body: Payload(authorization_code: appleAuthorizationCode))
        )
        try? await client.auth.signOut(scope: .local)
    }

    // MARK: Profile

    func profile(id: UUID) async throws -> Profile? {
        let rows: [Profile] = try await client.from("profiles")
            .select()
            .eq("id", value: id)
            .limit(1)
            .execute()
            .value
        return rows.first
    }

    @discardableResult
    func save(_ profile: Profile) async throws -> Profile {
        try await client.from("profiles")
            .upsert(profile)
            .select()
            .single()
            .execute()
            .value
    }

    /// Updates only the alert location, and only while alerts are still on.
    func updateAlertLocation(userID: UUID, latitude: Double, longitude: Double) async throws -> Profile? {
        struct Location: Encodable {
            let alert_lat: Double
            let alert_lng: Double
        }
        let rows: [Profile] = try await client.from("profiles")
            .update(Location(alert_lat: latitude, alert_lng: longitude))
            .eq("id", value: userID)
            .eq("gathering_alerts", value: true)
            .select()
            .execute()
            .value
        return rows.first
    }

    // MARK: Journal

    func gatheringsToLog() async throws -> [GatheringToLog] {
        try await client.rpc("gatherings_to_log").execute().value
    }

    func activityLogs(limit: Int = 500) async throws -> [ActivityLog] {
        try await client.from("activity_logs")
            .select()
            .order("completed_at", ascending: false)
            .limit(limit)
            .execute()
            .value
    }

    func log(_ entry: NewActivityLog) async throws -> ActivityLog {
        try await client.from("activity_logs")
            .insert(entry)
            .select()
            .single()
            .execute()
            .value
    }

    func updateReflection(logID: UUID, reflection: String?) async throws {
        try await client.from("activity_logs")
            .update(["reflection": reflection])
            .eq("id", value: logID)
            .execute()
    }

    func deleteLog(id: UUID) async throws {
        try await client.from("activity_logs").delete().eq("id", value: id).execute()
    }

    // MARK: Push alerts

    func registerDevice(token: String, environment: String) async throws {
        struct Params: Encodable {
            let p_token: String
            let p_environment: String
        }
        try await client.rpc("register_push_device", params: Params(p_token: token, p_environment: environment)).execute()
    }

    func unregisterDevice(token: String) async throws {
        try await client.from("push_devices").delete().eq("token", value: token).execute()
    }

    /// Best effort: a missed alert shouldn't block hosting or joining.
    func sendGatheringAlert(_ kind: GatheringAlertKind, gatheringID: UUID) async {
        struct Payload: Encodable {
            let type: String
            let gathering_id: UUID
        }
        try? await client.functions.invoke(
            "gathering-alerts",
            options: FunctionInvokeOptions(body: Payload(type: kind.rawValue, gathering_id: gatheringID))
        )
    }

    // MARK: Gatherings

    func gathering(id: UUID, userID: UUID) async throws -> Gathering? {
        let rows: [Gathering] = try await client.from("gatherings")
            .select()
            .eq("id", value: id)
            .eq("cancelled", value: false)
            .limit(1)
            .execute()
            .value
        guard var gathering = rows.first else { return nil }
        struct RSVP: Decodable { let user_id: UUID }
        let mine: [RSVP] = try await client.from("gathering_rsvps")
            .select("user_id")
            .eq("gathering_id", value: id)
            .eq("user_id", value: userID)
            .execute()
            .value
        gathering.isGoing = !mine.isEmpty
        return gathering
    }

    func nearbyGatherings(latitude: Double, longitude: Double, radiusKm: Double) async throws -> [Gathering] {
        struct Params: Encodable {
            let p_lat: Double
            let p_lng: Double
            let p_radius_km: Double
        }
        return try await client
            .rpc("nearby_gatherings", params: Params(p_lat: latitude, p_lng: longitude, p_radius_km: radiusKm))
            .execute()
            .value
    }

    func myUpcomingGatherings() async throws -> [Gathering] {
        try await client.rpc("my_upcoming_gatherings").execute().value
    }

    /// Creates one gathering, or every date of a weekly one in a single request.
    func create(_ dates: [NewGathering]) async throws -> [Gathering] {
        let created: [Gathering] = try await client.from("gatherings")
            .insert(dates)
            .select()
            .execute()
            .value
        return created
            .map { gathering in
                var gathering = gathering
                gathering.isGoing = true
                gathering.attendeeCount = max(gathering.attendeeCount, 1)
                return gathering
            }
            .sorted { $0.startsAt < $1.startsAt }
    }

    func gathering(inviteCode: String) async throws -> Gathering? {
        let rows: [Gathering] = try await client
            .rpc("gathering_by_invite", params: ["p_code": inviteCode])
            .execute()
            .value
        return rows.first
    }

    /// The other upcoming dates of a weekly gathering.
    func seriesDates(seriesID: UUID) async throws -> [Gathering] {
        try await client.from("gatherings")
            .select()
            .eq("series_id", value: seriesID)
            .eq("cancelled", value: false)
            .gt("starts_at", value: Date.now.addingTimeInterval(-6 * 60 * 60))
            .order("starts_at")
            .execute()
            .value
    }

    /// Safe to call twice: joining a gathering you already joined does nothing.
    func join(gatheringID: UUID) async throws {
        try await client.from("gathering_rsvps")
            .upsert(["gathering_id": gatheringID], onConflict: "gathering_id,user_id", ignoreDuplicates: true)
            .execute()
    }

    func joinWaitlist(gatheringID: UUID) async throws {
        try await client.from("gathering_waitlist")
            .upsert(["gathering_id": gatheringID], onConflict: "gathering_id,user_id", ignoreDuplicates: true)
            .execute()
    }

    func leaveWaitlist(gatheringID: UUID, userID: UUID) async throws {
        try await client.from("gathering_waitlist")
            .delete()
            .eq("gathering_id", value: gatheringID)
            .eq("user_id", value: userID)
            .execute()
    }

    func confirm(gatheringID: UUID) async throws {
        struct Stamp: Encodable { let confirmed_at: Date }
        try await client.from("gathering_rsvps")
            .update(Stamp(confirmed_at: .now))
            .eq("gathering_id", value: gatheringID)
            .execute()
    }

    func arrive(gatheringID: UUID) async throws {
        struct Stamp: Encodable { let arrived_at: Date }
        try await client.from("gathering_rsvps")
            .update(Stamp(arrived_at: .now))
            .eq("gathering_id", value: gatheringID)
            .execute()
    }

    func announcements(gatheringID: UUID) async throws -> [GatheringAnnouncement] {
        try await client.from("gathering_announcements")
            .select()
            .eq("gathering_id", value: gatheringID)
            .order("created_at")
            .execute()
            .value
    }

    func postAnnouncement(gatheringID: UUID, body: String) async throws -> GatheringAnnouncement {
        struct Note: Encodable {
            let gathering_id: UUID
            let body: String
        }
        let rows: [GatheringAnnouncement] = try await client.from("gathering_announcements")
            .insert(Note(gathering_id: gatheringID, body: body))
            .select()
            .execute()
            .value
        guard let note = rows.first else { throw URLError(.badServerResponse) }
        return note
    }

    func hostedCount(hostID: UUID) async throws -> Int {
        try await client
            .rpc("host_completed_count", params: ["p_host_id": hostID])
            .execute()
            .value
    }

    func leave(gatheringID: UUID, userID: UUID) async throws {
        try await client.from("gathering_rsvps")
            .delete()
            .eq("gathering_id", value: gatheringID)
            .eq("user_id", value: userID)
            .execute()
    }

    /// Only returns names for gatherings the signed-in user hosts.
    func attendees(gatheringID: UUID) async throws -> [Attendee] {
        try await client.rpc("gathering_attendees", params: ["p_gathering_id": gatheringID]).execute().value
    }

    func updateMeetingNote(gatheringID: UUID, note: String) async throws {
        try await client.from("gatherings")
            .update(["meeting_note": note])
            .eq("id", value: gatheringID)
            .execute()
    }

    /// Cancels every date of a weekly gathering that hasn't started yet, and returns their IDs.
    func cancelSeries(seriesID: UUID) async throws -> [UUID] {
        struct Row: Decodable { let id: UUID }
        let rows: [Row] = try await client.from("gatherings")
            .update(["cancelled": true])
            .eq("series_id", value: seriesID)
            .eq("cancelled", value: false)
            .gt("starts_at", value: Date.now)
            .select("id")
            .execute()
            .value
        return rows.map(\.id)
    }

    func cancel(gatheringID: UUID) async throws {
        try await client.from("gatherings")
            .update(["cancelled": true])
            .eq("id", value: gatheringID)
            .execute()
    }

    func report(gathering: Gathering, reason: String) async throws {
        struct Report: Encodable {
            let id: UUID
            let gathering_id: UUID
            let reported_user_id: UUID
            let reason: String
        }
        // Reporters can't read reports back, so the ID is chosen here to tell moderators about it.
        let id = UUID()
        try await client.from("reports")
            .insert(Report(id: id, gathering_id: gathering.id, reported_user_id: gathering.hostID, reason: reason))
            .execute()
        struct Alert: Encodable {
            let type: String
            let report_id: UUID
        }
        try? await client.functions.invoke(
            "gathering-alerts",
            options: FunctionInvokeOptions(body: Alert(type: "reported", report_id: id))
        )
    }

    func block(userID: UUID) async throws {
        try await client.from("blocks")
            .upsert(["blocked_id": userID], onConflict: "blocker_id,blocked_id", ignoreDuplicates: true)
            .execute()
    }
}

enum GatheringAlertKind: String, Sendable {
    case created, joined, cancelled
}

extension Error {
    /// Readable message for errors raised by the database (for example "This gathering is full").
    var userMessage: String {
        if let error = self as? PostgrestError { return error.message }
        if let error = self as? AuthError { return error.message }
        if case let .httpError(_, data) = self as? FunctionsError,
           let body = try? JSONDecoder().decode([String: String].self, from: data),
           let message = body["error"] {
            return message
        }
        if (self as? URLError) != nil { return "You appear to be offline. Check your connection and try again." }
        return localizedDescription
    }
}
