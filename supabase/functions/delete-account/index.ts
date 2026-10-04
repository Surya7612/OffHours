// Deletes the signed-in user's account and everything they own, after revoking their Sign in
// with Apple token as Apple requires for account deletion.
//
// POST { "authorization_code": "<from a fresh Sign in with Apple prompt>" }
// Authorization: Bearer <the signed-in user's access token>
//
// Secrets: SIWA_KEY_ID and SIWA_PRIVATE_KEY (a .p8 key with Sign in with Apple enabled).
// Also uses APNS_TEAM_ID and APNS_TOPIC (the bundle ID, which is the Sign in with Apple client ID).

import { createClient, type User } from "@supabase/supabase-js";
import { es256JWT, json, unverifiedClaims } from "../_shared/apple.ts";

const supabaseURL = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseURL, serviceKey, { auth: { persistSession: false } });

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Use POST" }, 405);

  const userClient = createClient(supabaseURL, anonKey, {
    global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Not signed in" }, 401);

  let body: { authorization_code?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  let revoked = false;
  if (body.authorization_code) {
    const result = await revokeAppleSignIn(body.authorization_code, user);
    if (result === "wrong-apple-id") {
      return json({ error: "Confirm with the Apple ID you use for OffHours." }, 403);
    }
    revoked = result === "revoked";
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("Account deletion failed", user.id, error.message);
    return json({ error: "We couldn't delete your account. Please try again." }, 500);
  }
  return json({ deleted: true, revoked });
});

type RevokeResult = "revoked" | "wrong-apple-id" | "failed";

async function revokeAppleSignIn(code: string, user: User): Promise<RevokeResult> {
  const keyID = Deno.env.get("SIWA_KEY_ID");
  const privateKey = Deno.env.get("SIWA_PRIVATE_KEY");
  const teamID = Deno.env.get("APNS_TEAM_ID");
  const clientID = Deno.env.get("APNS_TOPIC");
  if (!keyID || !privateKey || !teamID || !clientID) {
    console.error("Sign in with Apple secrets are missing; skipping token revocation");
    return "failed";
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const clientSecret = await es256JWT(privateKey, keyID, {
      iss: teamID,
      iat: now,
      exp: now + 300,
      aud: "https://appleid.apple.com",
      sub: clientID,
    });

    const tokenResponse = await fetch("https://appleid.apple.com/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientID,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenResponse.ok) {
      console.error("Apple token exchange failed", tokenResponse.status, await tokenResponse.text());
      return "failed";
    }
    const tokens = await tokenResponse.json() as { refresh_token?: string; access_token?: string; id_token?: string };

    const appleSubject = tokens.id_token ? unverifiedClaims(tokens.id_token).sub : undefined;
    const accountSubjects = (user.identities ?? [])
      .filter((identity) => identity.provider === "apple")
      .map((identity) => (identity.identity_data?.sub as string | undefined) ?? identity.id);
    if (appleSubject && accountSubjects.length > 0 && !accountSubjects.includes(appleSubject as string)) {
      return "wrong-apple-id";
    }

    const token = tokens.refresh_token ?? tokens.access_token;
    if (!token) return "failed";
    const revokeResponse = await fetch("https://appleid.apple.com/auth/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientID,
        client_secret: clientSecret,
        token,
        token_type_hint: tokens.refresh_token ? "refresh_token" : "access_token",
      }),
    });
    if (!revokeResponse.ok) {
      console.error("Apple token revocation failed", revokeResponse.status, await revokeResponse.text());
      return "failed";
    }
    return "revoked";
  } catch (error) {
    console.error("Apple token revocation failed", error);
    return "failed";
  }
}
