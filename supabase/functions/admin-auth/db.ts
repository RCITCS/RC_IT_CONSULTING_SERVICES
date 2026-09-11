const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const LEGACY_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

let MODERN_SECRET_KEY = "";
try {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    const keys = JSON.parse(raw);
    MODERN_SECRET_KEY = String(keys.default ?? Object.values(keys)[0] ?? "");
  }
} catch {
  // Invalid secret configuration is handled by the fail-closed request helper.
}

const API_KEY = MODERN_SECRET_KEY || LEGACY_SERVICE_ROLE_KEY;
const USING_LEGACY_KEY = !MODERN_SECRET_KEY && Boolean(LEGACY_SERVICE_ROLE_KEY);

async function rest(path: string, init: RequestInit = {}): Promise<Response> {
  if (!SUPABASE_URL || !API_KEY) throw new Error("configuration unavailable");

  const requestHeaders = new Headers(init.headers);
  requestHeaders.set("apikey", API_KEY);
  if (USING_LEGACY_KEY) {
    requestHeaders.set("authorization", `Bearer ${LEGACY_SERVICE_ROLE_KEY}`);
  }
  requestHeaders.set("content-type", "application/json");
  if (!requestHeaders.has("prefer")) {
    requestHeaders.set("prefer", "return=representation");
  }

  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: requestHeaders
  });
}

async function rows(response: Response): Promise<any[]> {
  if (!response.ok) throw new Error("database request failed");
  const body = await response.json();
  return Array.isArray(body) ? body : [];
}

async function jsonResult(response: Response): Promise<any> {
  if (!response.ok) throw new Error("database request failed");
  const body = await response.json();
  return Array.isArray(body) && body.length === 1 ? body[0] : body;
}

async function booleanResult(response: Response): Promise<boolean> {
  if (!response.ok) return false;
  const body = await response.json();
  return body === true || (Array.isArray(body) && body[0] === true);
}

export async function adminByEmail(email: string) {
  const data = await rows(await rest(
    `admins?email=eq.${encodeURIComponent(email)}&status=eq.active&select=id,email,full_name,role,status,last_login_at,password_hash&limit=1`,
    { method: "GET" }
  ));
  return data.length === 1 ? data[0] : null;
}

export async function adminById(id: string) {
  const data = await rows(await rest(
    `admins?id=eq.${encodeURIComponent(id)}&status=eq.active&select=id,email,full_name,role,status,last_login_at&limit=1`,
    { method: "GET" }
  ));
  return data.length === 1 ? data[0] : null;
}

export async function verifyPassword(id: string, password: string): Promise<boolean> {
  return booleanResult(await rest("rpc/verify_admin_password", {
    method: "POST",
    body: JSON.stringify({ p_admin_id: id, p_password: password })
  }));
}

export async function saveNewPassword(id: string, password: string): Promise<boolean> {
  return booleanResult(await rest("rpc/set_admin_password", {
    method: "POST",
    body: JSON.stringify({ p_admin_id: id, p_password: password })
  }));
}

export async function changePassword(
  id: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  return booleanResult(await rest("rpc/change_admin_password", {
    method: "POST",
    body: JSON.stringify({
      p_admin_id: id,
      p_current_password: currentPassword,
      p_new_password: newPassword
    })
  }));
}

export async function updateLastLogin(id: string) {
  const data = await rows(await rest(`admins?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }));
  if (data.length !== 1) throw new Error("last login update failed");
}

export async function createSession(data: Record<string, unknown>) {
  const response = await rest("rpc/create_admin_session", {
    method: "POST",
    body: JSON.stringify({
      p_admin_id: data.admin_id,
      p_token_hash: data.token_hash,
      p_csrf_token_hash: data.csrf_token_hash,
      p_ip_hash: data.ip_hash,
      p_user_agent: data.user_agent,
      p_expires_at: data.expires_at
    })
  });
  if (!response.ok) throw new Error("session create failed");
  return response.json();
}

export async function sessionContextByHash(hash: string, idleCutoff: string) {
  const payload = JSON.stringify({
    p_token_hash: hash,
    p_idle_cutoff: idleCutoff
  });
  const response = await rest("rpc/get_admin_session_context", {
    method: "POST",
    body: payload
  });
  if (response.ok) {
    const body = await response.json();
    return Array.isArray(body) ? body[0] ?? null : body;
  }

  // The dashboard context applies the same server-authoritative session checks and is
  // a safe fallback if PostgREST temporarily fails to expose the dedicated session RPC.
  const fallback = await rest("rpc/get_admin_dashboard_page_context", {
    method: "POST",
    body: payload
  });
  if (!fallback.ok) throw new Error("session context request failed");
  const body = await fallback.json();
  const context = Array.isArray(body) ? body[0] ?? null : body;
  return context?.session ?? null;
}

export async function dashboardPageContextByHash(hash: string, idleCutoff: string) {
  const response = await rest("rpc/get_admin_dashboard_page_context", {
    method: "POST",
    body: JSON.stringify({
      p_token_hash: hash,
      p_idle_cutoff: idleCutoff
    })
  });
  if (!response.ok) throw new Error("dashboard page context request failed");
  const body = await response.json();
  return Array.isArray(body) ? body[0] ?? null : body;
}

export async function revokeSession(id: string) {
  const response = await rest(`sessions?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ revoked_at: new Date().toISOString() })
  });
  if (!response.ok) throw new Error("session revoke failed");
}

export async function audit(
  action: string,
  adminId: string | null,
  ipHash: string,
  userAgent: string,
  metadata: Record<string, unknown>
) {
  const response = await rest("audit_logs", {
    method: "POST",
    body: JSON.stringify({
      admin_id: adminId,
      action,
      entity_type: "authentication",
      ip_hash: ipHash,
      user_agent: userAgent,
      metadata
    })
  });
  if (!response.ok) throw new Error("audit failed");
}

async function auditCount(action: string, ipHash: string, since: string, limit: number) {
  const data = await rows(await rest(
    `audit_logs?action=eq.${encodeURIComponent(action)}&ip_hash=eq.${encodeURIComponent(ipHash)}&created_at=gte.${encodeURIComponent(since)}&select=id&limit=${limit}`,
    { method: "GET" }
  ));
  return data.length;
}

export async function failedCount(ipHash: string) {
  return auditCount(
    "admin_login_failed",
    ipHash,
    new Date(Date.now() - 15 * 60_000).toISOString(),
    5
  );
}

export async function resetRequestCount(ipHash: string) {
  return auditCount(
    "admin_password_reset_requested",
    ipHash,
    new Date(Date.now() - 60 * 60_000).toISOString(),
    3
  );
}

export async function queueResetRequest(adminId: string, email: string) {
  const response = await rest("email_logs", {
    method: "POST",
    body: JSON.stringify({
      provider: "pending",
      template_key: "admin_password_reset",
      recipient_email: email,
      subject: "RC IT Services administrator password reset",
      status: "queued",
      metadata: {
        admin_id: adminId,
        purpose: "admin_password_reset",
        token_generation: "at_send_time",
        delivery_phase: 13
      }
    })
  });
  if (!response.ok) throw new Error("reset queue failed");
}

export async function resetByHash(hash: string) {
  const now = new Date().toISOString();
  const data = await rows(await rest(
    `password_reset_tokens?token_hash=eq.${encodeURIComponent(hash)}&used_at=is.null&expires_at=gt.${encodeURIComponent(now)}&select=id,admin_id,expires_at&limit=1`,
    { method: "GET" }
  ));
  return data.length === 1 ? data[0] : null;
}

export async function consumeResetToken(tokenHash: string, newPassword: string): Promise<boolean> {
  return booleanResult(await rest("rpc/consume_admin_password_reset_token", {
    method: "POST",
    body: JSON.stringify({
      p_token_hash: tokenHash,
      p_new_password: newPassword
    })
  }));
}

export async function dashboardSnapshot(adminId: string) {
  const response = await rest("rpc/get_admin_dashboard_snapshot", {
    method: "POST",
    body: JSON.stringify({ p_admin_id: adminId })
  });
  if (!response.ok) throw new Error("dashboard request failed");
  const body = await response.json();
  return Array.isArray(body) ? body[0] ?? null : body;
}

export async function jobManagementContext(adminId: string, jobId: string | null = null) {
  return jsonResult(await rest("rpc/get_admin_job_management_context", {
    method: "POST",
    body: JSON.stringify({ p_admin_id: adminId, p_job_id: jobId })
  }));
}

export async function saveJob(
  adminId: string,
  jobId: string | null,
  expectedVersion: number | null,
  payload: Record<string, unknown>,
  ipHash: string,
  userAgent: string
) {
  return jsonResult(await rest("rpc/admin_save_job", {
    method: "POST",
    body: JSON.stringify({
      p_admin_id: adminId,
      p_job_id: jobId,
      p_expected_version: expectedVersion,
      p_payload: payload,
      p_ip_hash: ipHash,
      p_user_agent: userAgent
    })
  }));
}

export async function transitionJob(
  adminId: string,
  jobId: string,
  expectedVersion: number,
  action: string,
  ipHash: string,
  userAgent: string
) {
  return jsonResult(await rest("rpc/admin_transition_job", {
    method: "POST",
    body: JSON.stringify({
      p_admin_id: adminId,
      p_job_id: jobId,
      p_expected_version: expectedVersion,
      p_action: action,
      p_ip_hash: ipHash,
      p_user_agent: userAgent
    })
  }));
}

export async function duplicateJob(
  adminId: string,
  jobId: string,
  expectedVersion: number,
  ipHash: string,
  userAgent: string
) {
  return jsonResult(await rest("rpc/admin_duplicate_job", {
    method: "POST",
    body: JSON.stringify({
      p_admin_id: adminId,
      p_job_id: jobId,
      p_expected_version: expectedVersion,
      p_ip_hash: ipHash,
      p_user_agent: userAgent
    })
  }));
}

export async function deleteJob(
  adminId: string,
  jobId: string,
  expectedVersion: number,
  ipHash: string,
  userAgent: string
) {
  return jsonResult(await rest("rpc/admin_delete_job", {
    method: "POST",
    body: JSON.stringify({
      p_admin_id: adminId,
      p_job_id: jobId,
      p_expected_version: expectedVersion,
      p_ip_hash: ipHash,
      p_user_agent: userAgent
    })
  }));
}
