// Sends push alerts. Called by the app right after a user hosts or joins a gathering, or files
// a report.
//
// POST { "type": "created" | "joined", "gathering_id": "<uuid>" }
// POST { "type": "reported", "report_id": "<uuid>" }
// Authorization: Bearer <the signed-in user's access token>
//
// Required secrets: APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (contents of the .p8 file),
// APNS_TOPIC (the app's bundle ID).

import { createClient } from "@supabase/supabase-js";
import { type Device, json, sendPush } from "../_shared/apple.ts";

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
const forgetDevice = async (token: string) => {
  await admin.from("push_devices").delete().eq("token", token);
};
const uuidPattern = /^[0-9a-f-]{36}$/i;

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Use POST" }, 405);

  const authorization = request.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseURL, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Not signed in" }, 401);

  let body: { type?: string; gathering_id?: string; report_id?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (body.type === "reported") {
    if (!body.report_id || !uuidPattern.test(body.report_id)) return json({ error: "report_id is required" }, 400);
    const { data, error } = await admin.rpc("claim_report_alert", {
      p_report_id: body.report_id,
      p_reporter_id: user.id,
    });
    if (error) return json({ error: error.message }, 500);
    const rows = (data ?? []) as (Device & { reason: string; gathering_id: string | null; gathering_title: string | null })[];
    const report = rows[0];
    const sent = await sendPush(rows, {
      title: report?.gathering_title ? `Report: ${report.gathering_title}` : "New report",
      body: `${report?.reason ?? ""}\nReview it in Supabase within 24 hours.`,
      threadID: "reports",
      gatheringID: report?.gathering_id,
    }, forgetDevice);
    return json({ sent });
  }

  if (!body.gathering_id || !uuidPattern.test(body.gathering_id)) {
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
    const sent = await sendPush((data ?? []) as Device[], {
      title: `Near you: ${gathering.title}`,
      body: `${describeTime(gathering.starts_at)} at ${gathering.place_name}. Hosted by ${gathering.host_name}.`,
      gatheringID: gathering.id,
      threadID: "gatherings-nearby",
    }, forgetDevice);
    return json({ sent });
  }

  if (body.type === "joined") {
    const { data, error } = await admin.rpc("claim_join_alert", {
      p_gathering_id: gathering.id,
      p_joiner_id: user.id,
    });
    if (error) return json({ error: error.message }, 500);
    const rows = (data ?? []) as (Device & { joiner_name: string; gathering_title: string })[];
    const sent = await sendPush(rows, {
      title: `${rows[0]?.joiner_name ?? "Someone"} is coming`,
      body: `They joined ${gathering.title}.`,
      gatheringID: gathering.id,
      threadID: `gathering-${gathering.id}`,
    }, forgetDevice);
    return json({ sent });
  }

  return json({ error: "type must be created, joined or reported" }, 400);
});

/** "Tomorrow, 6:30 PM" style text. Uses the server clock, so keep it relative and coarse. */
function describeTime(iso: string): string {
  const start = new Date(iso);
  const hours = (start.getTime() - Date.now()) / 3_600_000;
  if (hours < 1) return "Starting soon";
  if (hours < 24) return `In ${Math.round(hours)} hours`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Tomorrow" : `In ${days} days`;
}
