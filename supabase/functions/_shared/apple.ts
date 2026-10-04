// Signing for Apple services. APNs and Sign in with Apple both take ES256 JWTs signed with a
// .p8 key from the Apple Developer portal.

export async function es256JWT(
  privateKeyPEM: string,
  keyID: string,
  claims: Record<string, unknown>,
): Promise<string> {
  const pem = privateKeyPEM.replace(/\\n/g, "\n");
  const der = Uint8Array.from(
    atob(pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, "")),
    (char) => char.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);

  const header = base64url(JSON.stringify({ alg: "ES256", kid: keyID }));
  const payload = base64url(JSON.stringify(claims));
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${base64url(new Uint8Array(signature))}`;
}

export function base64url(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Reads a JWT's claims without checking the signature. Only for tokens fetched straight from Apple. */
export function unverifiedClaims(jwt: string): Record<string, unknown> {
  const part = jwt.split(".")[1] ?? "";
  const padded = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
  return JSON.parse(atob(padded));
}

// APNs ---------------------------------------------------------------------------------------

export type Device = { token: string; environment: "sandbox" | "production" };

export type PushAlert = {
  title: string;
  body: string;
  threadID: string;
  gatheringID?: string | null;
};

let cachedProviderToken: { value: string; issuedAt: number } | undefined;

/** Provider token for APNs; Apple accepts each one for up to an hour. */
async function apnsProviderToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedProviderToken && now - cachedProviderToken.issuedAt < 50 * 60) return cachedProviderToken.value;
  const value = await es256JWT(Deno.env.get("APNS_PRIVATE_KEY")!, Deno.env.get("APNS_KEY_ID")!, {
    iss: Deno.env.get("APNS_TEAM_ID")!,
    iat: now,
  });
  cachedProviderToken = { value, issuedAt: now };
  return value;
}

/** Sends to every device and returns how many accepted. Calls `onDeadToken` for uninstalled apps. */
export async function sendPush(
  devices: Device[],
  alert: PushAlert,
  onDeadToken: (token: string) => Promise<unknown>,
): Promise<number> {
  if (devices.length === 0) return 0;
  const jwt = await apnsProviderToken();
  const results = await Promise.allSettled(devices.map(async (device) => {
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
        ...(alert.gatheringID ? { gathering_id: alert.gatheringID } : {}),
      }),
    });
    if (response.ok) return true;
    const reason = (await response.json().catch(() => ({}))).reason as string | undefined;
    if (response.status === 410 || reason === "BadDeviceToken" || reason === "Unregistered") {
      await onDeadToken(device.token);
    } else {
      console.error("APNs rejected a push", response.status, reason);
    }
    return false;
  }));
  return results.filter((result) => result.status === "fulfilled" && result.value).length;
}

export function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
