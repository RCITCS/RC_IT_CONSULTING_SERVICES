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
  // Fail closed in the request helper when configuration is unavailable.
}

const API_KEY = MODERN_SECRET_KEY || LEGACY_SERVICE_ROLE_KEY;
const USING_LEGACY_KEY = !MODERN_SECRET_KEY && Boolean(LEGACY_SERVICE_ROLE_KEY);

function headers(): Headers {
  if (!SUPABASE_URL || !API_KEY) throw new Error("security activity configuration unavailable");
  const value = new Headers({
    apikey: API_KEY,
    "content-type": "application/json",
    accept: "application/json"
  });
  if (USING_LEGACY_KEY) value.set("authorization", `Bearer ${LEGACY_SERVICE_ROLE_KEY}`);
  return value;
}

export type SecurityAuditEvent = {
  id?: string;
  created_at?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string | null;
  outcome?: "success" | "failure" | "denied" | string;
  actor_label?: string;
  request_ref?: string | null;
  session_ref?: string | null;
  has_network_context?: boolean;
  source_label?: string;
};

export type SecurityAuditContext = {
  events: SecurityAuditEvent[];
  limit: number;
  has_older: boolean;
  generated_at?: string;
  projection?: string;
};

export async function securityAuditContext(adminId: string): Promise<SecurityAuditContext> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(adminId)) {
    throw new Error("invalid admin authority");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_admin_audit_activity`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ p_admin_id: adminId, p_limit: 100 }),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error("security activity unavailable");
  const body = await response.json();
  const context = Array.isArray(body) ? body[0] ?? null : body;
  if (!context || !Array.isArray(context.events)) throw new Error("security activity response invalid");

  return {
    events: context.events.slice(0, 100),
    limit: Math.min(Math.max(Number(context.limit) || 100, 1), 100),
    has_older: context.has_older === true,
    generated_at: String(context.generated_at ?? ""),
    projection: String(context.projection ?? "")
  };
}
