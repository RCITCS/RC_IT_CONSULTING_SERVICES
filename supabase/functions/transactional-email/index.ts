import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { dispatchAdminPasswordReset } from "../_shared/admin-password-reset-delivery.js";
import { dispatchApplicationEmail } from "../_shared/application-email-delivery.js";
import { EMAIL_TEMPLATE_KEYS } from "../_shared/email-contract.js";
import { createResendEmailProvider } from "../_shared/resend-email-provider.js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const LEGACY_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

let MODERN_SECRET_KEY = "";
try {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    const keys = JSON.parse(raw);
    MODERN_SECRET_KEY = String(keys.default ?? Object.values(keys)[0] ?? "");
  }
} catch {
  // Invalid secret configuration is reflected as databaseConfigured=false in health.
}

const API_KEY = MODERN_SECRET_KEY || LEGACY_SERVICE_ROLE_KEY;
const USING_LEGACY_KEY = !MODERN_SECRET_KEY && Boolean(LEGACY_SERVICE_ROLE_KEY);
const provider = createResendEmailProvider({ apiKey: RESEND_API_KEY });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function route(url: URL): string {
  let path = url.pathname || "/";
  for (const prefix of ["/functions/v1/transactional-email", "/transactional-email"]) {
    if (path === prefix) return "/";
    if (path.startsWith(`${prefix}/`)) return path.slice(prefix.length) || "/";
  }
  return path;
}

function headers(contentType = "application/json; charset=utf-8"): Headers {
  return new Headers({
    "content-type": contentType,
    "cache-control": "no-store, no-transform, max-age=0, must-revalidate",
    "x-robots-tag": "noindex, nofollow, noarchive",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer"
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: headers() });
}

async function shaBytes(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function secureEqual(left: string, right: string): Promise<boolean> {
  const [a, b] = await Promise.all([shaBytes(left), shaBytes(right)]);
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a[i] ^ b[i];
  return difference === 0;
}

async function internalAuthorized(request: Request): Promise<boolean> {
  if (!API_KEY) return false;
  const supplied = request.headers.get("authorization") ?? "";
  if (!supplied.startsWith("Bearer ")) return false;
  return secureEqual(supplied.slice(7), API_KEY);
}

async function rest(path: string, init: RequestInit = {}): Promise<Response> {
  if (!SUPABASE_URL || !API_KEY) throw new Error("database configuration unavailable");
  const requestHeaders = new Headers(init.headers);
  requestHeaders.set("apikey", API_KEY);
  if (USING_LEGACY_KEY) requestHeaders.set("authorization", `Bearer ${LEGACY_SERVICE_ROLE_KEY}`);
  requestHeaders.set("content-type", "application/json");
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: requestHeaders });
}

async function rpc(name: string, payload: Record<string, unknown>): Promise<unknown> {
  const response = await rest(`rpc/${name}`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("database request failed");
  return response.json();
}

async function rows(path: string): Promise<Record<string, unknown>[]> {
  const response = await rest(path, { method: "GET" });
  if (!response.ok) throw new Error("database request failed");
  const body = await response.json();
  return Array.isArray(body) ? body as Record<string, unknown>[] : [];
}

function scalarBoolean(value: unknown): boolean {
  if (value === true) return true;
  if (Array.isArray(value) && value.length === 1) return value[0] === true;
  return false;
}

async function claimEmail(emailLogId: string): Promise<Record<string, unknown> | null> {
  const value = await rpc("claim_transactional_email", { p_email_log_id: emailLogId });
  if (!value) return null;
  if (Array.isArray(value)) return (value[0] as Record<string, unknown> | undefined) ?? null;
  return typeof value === "object" ? value as Record<string, unknown> : null;
}

async function loadApplication(applicationId: string): Promise<Record<string, unknown> | null> {
  if (!UUID.test(applicationId)) return null;
  const data = await rows(
    `applications?id=eq.${encodeURIComponent(applicationId)}&select=id,public_reference,first_name,last_name,email,job_title,job_code,submitted_at&limit=1`
  );
  return data.length === 1 ? data[0] : null;
}

async function createResetToken({ adminId, tokenHash, expiresAt }: { adminId: string; tokenHash: string; expiresAt: string }): Promise<boolean> {
  return scalarBoolean(await rpc("create_admin_password_reset_token", {
    p_admin_id: adminId,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt
  }));
}

async function markSent({ emailLogId, providerMessageId }: { emailLogId: string; providerMessageId: string }): Promise<boolean> {
  return scalarBoolean(await rpc("mark_transactional_email_sent", {
    p_email_log_id: emailLogId,
    p_provider_message_id: providerMessageId
  }));
}

async function markFailed({ emailLogId, errorCode, errorMessage, retryAt }: { emailLogId: string; errorCode: string; errorMessage: string; retryAt: string | null }): Promise<boolean> {
  return scalarBoolean(await rpc("mark_transactional_email_failed", {
    p_email_log_id: emailLogId,
    p_error_code: errorCode,
    p_error_message: errorMessage,
    p_retry_at: retryAt
  }));
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

async function shaHex(value: string): Promise<string> {
  const bytes = await shaBytes(value);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function parseDispatchBody(request: Request): Promise<{ emailLogId: string } | null> {
  const lengthHeader = request.headers.get("content-length");
  if (lengthHeader && Number(lengthHeader) > 4096) return null;
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return null;
  try {
    const body = await request.json();
    const emailLogId = String(body?.emailLogId ?? "").trim();
    return UUID.test(emailLogId) ? { emailLogId } : null;
  } catch {
    return null;
  }
}

function applicationTemplate(templateKey: string): boolean {
  return templateKey === EMAIL_TEMPLATE_KEYS.APPLICATION_ACKNOWLEDGEMENT
    || templateKey === EMAIL_TEMPLATE_KEYS.INTERNAL_APPLICATION_ALERT;
}

Deno.serve(async (request: Request) => {
  const url = new URL(request.url);
  const path = route(url);

  if (request.method === "GET" && path === "/health") {
    return json({
      ok: true,
      service: "rcitcs-transactional-email",
      contract: "phase13-admin-reset-v1",
      provider: "resend",
      providerConfigured: provider.configured,
      databaseConfigured: Boolean(SUPABASE_URL && API_KEY),
      applicationNotifications: true
    });
  }

  if (request.method !== "POST" || path !== "/dispatch") {
    const responseHeaders = headers("text/plain; charset=utf-8");
    responseHeaders.set("allow", "GET, POST");
    return new Response("Not Found", { status: 404, headers: responseHeaders });
  }

  if (!(await internalAuthorized(request))) return json({ ok: false, code: "UNAUTHORIZED" }, 401);
  const body = await parseDispatchBody(request);
  if (!body) return json({ ok: false, code: "INVALID_REQUEST" }, 400);
  if (!provider.configured) return json({ ok: false, code: "EMAIL_PROVIDER_NOT_CONFIGURED" }, 503);

  let queue: Record<string, unknown> | null = null;
  try {
    queue = await claimEmail(body.emailLogId);
    if (!queue) return json({ ok: false, code: "EMAIL_NOT_CLAIMABLE" }, 409);
    const templateKey = String(queue.template_key ?? "").trim();

    let result;
    if (templateKey === EMAIL_TEMPLATE_KEYS.ADMIN_PASSWORD_RESET) {
      result = await dispatchAdminPasswordReset({
        queue,
        provider,
        createResetToken,
        markSent,
        markFailed,
        randomToken,
        shaHex
      });
    } else if (applicationTemplate(templateKey)) {
      const applicationId = String(queue.application_id ?? "").trim();
      const application = await loadApplication(applicationId);
      if (!application) throw new Error("persisted application unavailable");
      result = await dispatchApplicationEmail({ queue, application, provider, markSent, markFailed });
    } else {
      await markFailed({
        emailLogId: String(queue.id ?? ""),
        errorCode: "UNSUPPORTED_EMAIL_TEMPLATE",
        errorMessage: "Transactional email template is not supported by this dispatcher.",
        retryAt: null
      });
      return json({ ok: false, code: "UNSUPPORTED_EMAIL_TEMPLATE" }, 422);
    }

    return json({
      ok: true,
      emailLogId: result.emailLogId,
      provider: result.provider,
      providerMessageId: result.providerMessageId
    });
  } catch {
    if (queue?.id) {
      try {
        await markFailed({
          emailLogId: String(queue.id),
          errorCode: "EMAIL_DISPATCH_FAILED",
          errorMessage: "Transactional email dispatch failed.",
          retryAt: null
        });
      } catch {
        // Failure persistence is best effort after the primary dispatch failure.
      }
    }
    return json({ ok: false, code: "EMAIL_DISPATCH_FAILED" }, 503);
  }
});
