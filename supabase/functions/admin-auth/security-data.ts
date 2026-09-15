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
  event_ref?: string;
  created_at?: string;
  action?: string;
  entity_type?: string;
  entity_ref?: string | null;
  outcome?: "success" | "failure" | "denied" | string;
  actor_label?: string;
  request_ref?: string | null;
  session_ref?: string | null;
  has_network_context?: boolean;
  source_label?: string;
};

export type SecurityAuditFilters = {
  page: number;
  search: string;
  action: string;
  entityType: string;
  outcome: "" | "success" | "failure" | "denied";
  actor: "all" | "administrator" | "system";
  fromDate: string;
  toDate: string;
};

export type SecurityAuditContext = {
  events: SecurityAuditEvent[];
  page: number;
  page_size: number;
  has_previous: boolean;
  has_next: boolean;
  max_page: number;
  generated_at?: string;
  projection?: string;
};

export async function securityAuditContext(
  adminId: string,
  filters: SecurityAuditFilters
): Promise<SecurityAuditContext> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(adminId)) {
    throw new Error("invalid admin authority");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_admin_audit_activity_page`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      p_admin_id: adminId,
      p_page: filters.page,
      p_page_size: 25,
      p_search: filters.search || null,
      p_action: filters.action || null,
      p_entity_type: filters.entityType || null,
      p_outcome: filters.outcome || null,
      p_actor: filters.actor,
      p_from_date: filters.fromDate || null,
      p_to_date: filters.toDate || null
    }),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error("security activity unavailable");
  const body = await response.json();
  const context = Array.isArray(body) ? body[0] ?? null : body;
  if (!context || !Array.isArray(context.events)) throw new Error("security activity response invalid");

  return {
    events: context.events.slice(0, 25),
    page: Math.min(Math.max(Number(context.page) || 1, 1), 20),
    page_size: Math.min(Math.max(Number(context.page_size) || 25, 1), 25),
    has_previous: context.has_previous === true,
    has_next: context.has_next === true,
    max_page: Math.min(Math.max(Number(context.max_page) || 20, 1), 20),
    generated_at: String(context.generated_at ?? ""),
    projection: String(context.projection ?? "")
  };
}
