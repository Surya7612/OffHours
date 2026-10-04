// Sends push alerts for gatherings. Called by the app right after a user hosts or joins one.
//
// POST { "type": "created" | "joined", "gathering_id": "<uuid>" }
// Authorization: Bearer <the signed-in user's access token>
//
// Required secrets: APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (contents of the .p8 file),
// APNS_TOPIC (the app's bundle ID).

import { createClient } from "@supabase/supabase-js";

type Device = { token: string; environment: "sandbox" | "production" };

type Gathering = {
  id: string;
  host_id: string;
  host_name: string;
  title: string;
  starts_at: string;
  place_name: string;
  cancelled: boolean;
};

const supabaseURL = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseURL, serviceKey, { auth: { persistSession: false } });

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Use POST" }, 405);

  const authorization = request.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseURL, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Not signed in" }, 401);

  let body: { type?: string; gathering_id?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body.gathering_id || !/^[0-9a-f-]{36}$/i.test(body.gathering_id)) {
    return json({ error: "gathering_id is required" }, 400);
  }

  const { data: gathering } = await admin
    .from("gatherings")
    .select("id, host_id, host_name, title, starts_at, place_name, cancelled")
    .eq("id", body.gathering_id)
    .maybeSingle<Gathering>();
  if (!gathering || gathering.cancelled) return json({ sent: 0 });

  if (body.type === "created") {
    const { data, error } = await admin.rpc("claim_new_gathering_alerts", {
      p_gathering_id: gathering.id,
      p_host_id: user.id,
    });
    if (error) return json({ error: error.message }, 500);
    const devices = (data ?? []) as Device[];
    const sent = await sendAll(devices, {
      title: `Near you: ${gathering.title}`,
      body: `${describeTime(gathering.starts_at)} at ${gathering.place_name}. Hosted by ${gathering.host_name}.`,
      gatheringID: gathering.id,
      threadID: "gatherings-nearby",
    });
    return json({ sent });
  }

  if (body.type === "joined") {
    const { data, error } = await admin.rpc("claim_join_alert", {
      p_gathering_id: gathering.id,
      p_joiner_id: user.id,
    });
    if (error) return json({ error: error.message }, 500);
    const rows = (data ?? []) as (Device & { joiner_name: string; gathering_title: string })[];
    const sent = await sendAll(rows, {
      title: `${rows[0]?.joiner_name ?? "Someone"} is coming`,
      body: `They joined ${gathering.title}.`,
      gatheringID: gathering.id,
      threadID: `gathering-${gathering.id}`,
    });
    return json({ sent });
  }

  return json({ error: "type must be created or joined" }, 400);
});

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** "Tomorrow, 6:30 PM" style text. Uses the server clock, so keep it relative and coarse. */
function describeTime(iso: string): string {
  const start = new Date(iso);
  const hours = (start.getTime() - Date.now()) / 3_600_000;
  if (hours < 1) return "Starting soon";
  if (hours < 24) return `In ${Math.round(hours)} hours`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Tomorrow" : `In ${days} days`;
}

// APNs ---------------------------------------------------------------------------------------

type Alert = { title: string; body: string; gatheringID: string; threadID: string };

async function sendAll(devices: Device[], alert: Alert): Promise<number> {
  if (devices.length === 0) return 0;
  const jwt = await apnsToken();
  const results = await Promise.allSettled(devices.map((device) => send(device, alert, jwt)));
  return results.filter((result) => result.status === "fulfilled" && result.value).length;
}

async function send(device: Device, alert: Alert, jwt: string): Promise<boolean> {
  const host = device.environment === "production" ? "api.push.apple.com" : "api.sandbox.push.apple.com";
  const response = await fetch(`https://${host}/3/device/${device.token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": Deno.env.get("APNS_TOPIC")!,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "apns-expiration": String(Math.floor(Date.now() / 1000) + 6 * 3600),
    },
    body: JSON.stringify({
      aps: {
        alert: { title: alert.title, body: alert.body },
        sound: "default",
        "thread-id": alert.threadID,
      },
      gathering_id: alert.gatheringID,
    }),
  });

  if (response.ok) return true;
  const reason = (await response.json().catch(() => ({}))).reason as string | undefined;
  if (response.status === 410 || reason === "BadDeviceToken" || reason === "Unregistered") {
    await admin.from("push_devices").delete().eq("token", device.token);
  } else {
    console.error("APNs rejected a push", response.status, reason);
  }
  return false;
}

let cachedToken: { value: string; issuedAt: number } | undefined;

/** Provider token for APNs; Apple accepts each one for up to an hour. */
async function apnsToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now - cachedToken.issuedAt < 50 * 60) return cachedToken.value;

  const pem = Deno.env.get("APNS_PRIVATE_KEY")!.replace(/\\n/g, "\n");
  const der = Uint8Array.from(
    atob(pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, "")),
    (char) => char.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);

  const header = base64url(JSON.stringify({ alg: "ES256", kid: Deno.env.get("APNS_KEY_ID")! }));
  const claims = base64url(JSON.stringify({ iss: Deno.env.get("APNS_TEAM_ID")!, iat: now }));
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );
  const value = `${header}.${claims}.${base64url(new Uint8Array(signature))}`;
  cachedToken = { value, issuedAt: now };
  return value;
}

function base64url(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
