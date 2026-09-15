const SUPABASE_URL = String(Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
const LEGACY_SERVICE_ROLE_KEY = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

let MODERN_SECRET_KEY = "";
try {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    const keys = JSON.parse(raw) as Record<string, unknown>;
    MODERN_SECRET_KEY = String(keys.default ?? Object.values(keys)[0] ?? "");
  }
} catch {
  // Fail closed below when server credential configuration is unavailable.
}

const API_KEY = MODERN_SECRET_KEY || LEGACY_SERVICE_ROLE_KEY;
const USING_LEGACY_KEY = !MODERN_SECRET_KEY && Boolean(LEGACY_SERVICE_ROLE_KEY);

export type AuthRateLimitScope = "login_ip" | "login_global" | "reset_ip" | "reset_global";

export type AuthRateLimitResult = {
  allowed: boolean;
  attempts: number;
  remaining: number;
  retry_after: number;
  just_limited: boolean;
  expires_at?: string;
};

export async function consumeAuthRateLimit(
  scope: AuthRateLimitScope,
  bucketKey: string,
  limit: number,
  windowSeconds: number
): Promise<AuthRateLimitResult> {
  if (!SUPABASE_URL || !API_KEY) throw new Error("rate limit authority unavailable");

  const headers = new Headers({
    apikey: API_KEY,
    "content-type": "application/json",
    accept: "application/json"
  });
  if (USING_LEGACY_KEY) headers.set("authorization", `Bearer ${LEGACY_SERVICE_ROLE_KEY}`);

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_admin_auth_rate_limit`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      p_scope: scope,
      p_bucket_key: bucketKey,
      p_limit: limit,
      p_window_seconds: windowSeconds
    }),
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) throw new Error("rate limit authority unavailable");
  const raw = await response.json();
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || typeof value !== "object") throw new Error("rate limit authority invalid");

  return {
    allowed: value.allowed === true,
    attempts: Number(value.attempts ?? 0),
    remaining: Number(value.remaining ?? 0),
    retry_after: Number(value.retry_after ?? 0),
    just_limited: value.just_limited === true,
    expires_at: typeof value.expires_at === "string" ? value.expires_at : undefined
  };
}
