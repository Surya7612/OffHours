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

    func signOut() async throws {
        try await client.auth.signOut()
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

    // MARK: Journal

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

    func create(_ gathering: NewGathering) async throws -> Gathering {
        var created: Gathering = try await client.from("gatherings")
            .insert(gathering)
            .select()
            .single()
            .execute()
            .value
        created.isGoing = true
        created.attendeeCount = max(created.attendeeCount, 1)
        return created
    }

    func join(gatheringID: UUID) async throws {
        try await client.from("gathering_rsvps")
            .insert(["gathering_id": gatheringID])
            .execute()
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
