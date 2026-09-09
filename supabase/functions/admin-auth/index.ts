import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminByEmail,
  adminById,
  audit,
  changePassword,
  consumeResetToken,
  dashboardSnapshot,
  failedCount,
  queueResetRequest,
  resetByHash,
  resetRequestCount,
  revokeSession,
  saveNewPassword,
  sessionByHash,
  touchSession,
  updateLastLogin,
  verifyPassword,
  createSession
} from "./db.ts";
import { randomToken, shaHex, verifyBootstrapPassword } from "./crypto.js";
import {
  authPage,
  dashboardPage,
  esc,
  forgotPage,
  loginPage,
  privateHeaders
} from "./ui.ts";

const ADMIN_EMAIL = "rcitcservices@gmail.com";
const SESSION_TTL = 8 * 60 * 60;
const IDLE_TTL = 30 * 60;
const RECOVERY_TTL = 10 * 60;
const BOOTSTRAP_VERIFIER = Deno.env.get("ADMIN_BOOTSTRAP_PASSWORD_VERIFIER") ?? "";
const ADMIN_PROXY_HEADER = "x-rcitcs-admin-proxy";
const ADMIN_PROXY_VALUE = "cloudflare";
const ADMIN_PUBLIC_ORIGINS = new Set([
  "https://admin.rcitcs.com",
  "https://admin-staging.rcitcs.com"
]);

function base(url: URL): string {
  return url.hostname.endsWith(".supabase.co") ? "/functions/v1/admin-auth" : "";
}

function route(url: URL): string {
  let path = url.pathname || "/";
  for (const prefix of ["/functions/v1/admin-auth", "/admin-auth"]) {
    if (path === prefix) return "/";
    if (path.startsWith(`${prefix}/`)) {
      path = path.slice(prefix.length);
      break;
    }
  }
  return path || "/";
}

function parseCookies(request: Request): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator > 0) cookies[part.slice(0, separator).trim()] = decodeURIComponent(part.slice(separator + 1).trim());
  }
  return cookies;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: privateHeaders("application/json; charset=utf-8") });
}

function authCookies(url: URL, session = "", csrf = "", maxAge = SESSION_TTL): Headers {
  const headers = new Headers();
  const path = base(url) || "/";
  headers.append("set-cookie", `rcitcs_admin_session=${encodeURIComponent(session)}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict; Priority=High`);
  headers.append("set-cookie", `rcitcs_admin_csrf=${encodeURIComponent(csrf)}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict; Priority=High`);
  return headers;
}

function recoveryCookies(url: URL, token = "", csrf = "", maxAge = RECOVERY_TTL): Headers {
  const headers = new Headers();
  const path = `${base(url)}/reset-password` || "/reset-password";
  headers.append("set-cookie", `rcitcs_admin_recovery=${encodeURIComponent(token)}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict; Priority=High`);
  headers.append("set-cookie", `rcitcs_admin_recovery_csrf=${encodeURIComponent(csrf)}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict; Priority=High`);
  return headers;
}

function browserNavigationPostOk(request: Request): boolean {
  return request.headers.get("sec-fetch-site") === "same-origin"
    && request.headers.get("sec-fetch-mode") === "navigate"
    && request.headers.get("sec-fetch-dest") === "document"
    && request.headers.get("sec-fetch-user") === "?1";
}

function normalizedOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function originOk(request: Request, url: URL): boolean {
  const origin = request.headers.get("origin");
  const proxied = request.headers.get(ADMIN_PROXY_HEADER) === ADMIN_PROXY_VALUE;

  if (proxied) {
    if (!browserNavigationPostOk(request)) return false;
    if (!origin || origin === "null") return true;
    const parsedOrigin = normalizedOrigin(origin);
    return parsedOrigin !== null && ADMIN_PUBLIC_ORIGINS.has(parsedOrigin);
  }

  if (!origin || origin === "null") return false;
  const parsedOrigin = normalizedOrigin(origin);
  return parsedOrigin === `${url.protocol}//${url.host}`;
}

async function ipHash(request: Request): Promise<string> {
  const ip = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  return shaHex(ip);
}

function strong(value: string): boolean {
  return value.length >= 12 && value.length <= 256 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);
}

async function session(request: Request): Promise<any | null> {
  const cookies = parseCookies(request);
  if (!cookies.rcitcs_admin_session) return null;
  const row = await sessionByHash(await shaHex(cookies.rcitcs_admin_session), new Date(Date.now() - IDLE_TTL * 1000).toISOString());
  if (!row) return null;
  const admin = await adminById(row.admin_id);
  if (!admin) return null;
  if (!row.last_seen_at || Date.now() - Date.parse(row.last_seen_at) > 5 * 60_000) await touchSession(row.id);
  return { ...row, admin, csrf: cookies.rcitcs_admin_csrf ?? "" };
}

async function csrfOk(state: any, submitted: string): Promise<boolean> {
  return Boolean(submitted) && submitted === state.csrf && await shaHex(submitted) === state.csrf_token_hash;
}

async function recovery(request: Request): Promise<any | null> {
  const cookies = parseCookies(request);
  if (!cookies.rcitcs_admin_recovery) return null;
  const reset = await resetByHash(await shaHex(cookies.rcitcs_admin_recovery));
  if (!reset) return null;
  const admin = await adminById(reset.admin_id);
  if (!admin) return null;
  return { reset, admin, csrf: cookies.rcitcs_admin_recovery_csrf ?? "", token: cookies.rcitcs_admin_recovery };
}

Deno.serve(async (request: Request) => {
  const url = new URL(request.url);
  const path = route(url);
  const basePath = base(url);
  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 500);
  const clientHash = await ipHash(request);

  try {
    if (request.method === "GET" && path === "/health") return json({ ok: true, service: "rcitcs-admin", dashboard: true, design: "phase10-enterprise-workspace" });

    if (!["GET", "POST"].includes(request.method)) {
      const headers = privateHeaders();
      headers.set("allow", "GET, POST");
      return new Response("Method Not Allowed", { status: 405, headers });
    }
    if (request.method === "POST" && !originOk(request, url)) return authPage("Request rejected", "<h1>Request rejected</h1><p>Reload the administration page and try again.</p>", 403);
    if (request.method === "POST" && Number(request.headers.get("content-length") || "0") > 32768) return authPage("Request rejected", "<h1>Request too large</h1>", 413);

    if (request.method === "POST" && path === "/login") {
      if (await failedCount(clientHash) >= 5) {
        const headers = new Headers();
        headers.set("retry-after", "900");
        return authPage("Sign in limited", "<h1>Too many sign-in attempts</h1><div class=\"msg error\">Try again later.</div>", 429, headers);
      }
      const form = await request.formData();
      const email = String(form.get("email") ?? "").trim().toLowerCase();
      const password = String(form.get("password") ?? "");
      const admin = email === ADMIN_EMAIL ? await adminByEmail(email) : null;
      let accepted = false;
      if (admin && password.length > 0 && password.length <= 256) {
        if (admin.password_hash) accepted = await verifyPassword(admin.id, password);
        else if (BOOTSTRAP_VERIFIER && await verifyBootstrapPassword(password, BOOTSTRAP_VERIFIER)) {
          accepted = await saveNewPassword(admin.id, password);
          if (accepted) await audit("admin_bootstrap_password_activated", admin.id, clientHash, userAgent, {});
        }
      }
      if (!accepted || !admin) {
        await audit("admin_login_failed", null, clientHash, userAgent, {});
        return loginPage(basePath, "Invalid email or password.", true);
      }
      const rawSession = randomToken();
      const rawCsrf = randomToken();
      await createSession({
        admin_id: admin.id,
        token_hash: await shaHex(rawSession),
        csrf_token_hash: await shaHex(rawCsrf),
        ip_hash: clientHash,
        user_agent: userAgent,
        expires_at: new Date(Date.now() + SESSION_TTL * 1000).toISOString()
      });
      await updateLastLogin(admin.id);
      await audit("admin_login_success", admin.id, clientHash, userAgent, {});
      const headers = authCookies(url, rawSession, rawCsrf);
      headers.set("location", basePath || "/");
      return new Response(null, { status: 303, headers });
    }

    if (request.method === "GET" && path === "/forgot-password") return forgotPage(basePath);
    if (request.method === "POST" && path === "/forgot-password") {
      if (await resetRequestCount(clientHash) < 3) {
        const form = await request.formData();
        const email = String(form.get("email") ?? "").trim().toLowerCase();
        if (email === ADMIN_EMAIL) {
          const admin = await adminByEmail(email);
          if (admin) {
            await queueResetRequest(admin.id, admin.email);
            await audit("admin_password_reset_requested", admin.id, clientHash, userAgent, { delivery: "phase_13_queue" });
          }
        }
      }
      return forgotPage(basePath, true);
    }

    if (request.method === "GET" && path === "/reset-password" && url.searchParams.get("token")) {
      const raw = String(url.searchParams.get("token") ?? "");
      const reset = raw.length >= 32 && raw.length <= 256 ? await resetByHash(await shaHex(raw)) : null;
      if (!reset) return authPage("Reset link invalid", `<h1>Reset link invalid</h1><div class="msg error">This password-reset link is invalid, expired, or already used.</div><a class="btn secondary" href="${basePath}/forgot-password">Request another reset</a>`, 400);
      const csrf = randomToken();
      const headers = recoveryCookies(url, raw, csrf);
      headers.set("location", `${basePath}/reset-password`);
      return new Response(null, { status: 303, headers });
    }

    if (request.method === "GET" && path === "/reset-password") {
      const state = await recovery(request);
      if (!state) return authPage("Reset link invalid", `<h1>Reset link invalid</h1><div class="msg error">This password-reset link is invalid, expired, or already used.</div><a class="btn secondary" href="${basePath}/forgot-password">Request another reset</a>`, 400);
      return authPage("Reset password", `<h1>Choose a new password</h1><p>The reset link has been verified.</p><form method="post" action="${basePath}/reset-password"><input type="hidden" name="csrf" value="${esc(state.csrf)}"><div class="field"><label for="next">New password</label><input id="next" name="next" type="password" autocomplete="new-password" minlength="12" maxlength="256" required></div><div class="field"><label for="confirm">Confirm password</label><input id="confirm" name="confirm" type="password" autocomplete="new-password" minlength="12" maxlength="256" required></div><button class="btn" type="submit">Set new password</button><p class="muted">Minimum 12 characters with uppercase, lowercase, number and symbol.</p></form>`);
    }

    if (request.method === "POST" && path === "/reset-password") {
      const state = await recovery(request);
      if (!state) return authPage("Reset link invalid", "<h1>Reset link invalid</h1><div class=\"msg error\">This password-reset session is invalid or expired.</div>", 400);
      const form = await request.formData();
      const csrf = String(form.get("csrf") ?? "");
      if (!csrf || csrf !== state.csrf) return authPage("Request rejected", "<h1>Request rejected</h1><p>Reload and try again.</p>", 403);
      const next = String(form.get("next") ?? "");
      const confirm = String(form.get("confirm") ?? "");
      if (next !== confirm || !strong(next)) return authPage("Password not changed", "<h1>Password not changed</h1><div class=\"msg error\">The new password does not meet the password requirements.</div>", 400);
      if (!(await consumeResetToken(await shaHex(state.token), next))) throw new Error("password reset failed");
      await audit("admin_password_reset_completed", state.admin.id, clientHash, userAgent, {});
      const headers = recoveryCookies(url, "", "", 0);
      headers.set("location", `${basePath}/?password=reset`);
      return new Response(null, { status: 303, headers });
    }

    const authState = await session(request);
    if (request.method === "GET" && path === "/session") return authState ? json({ authenticated: true, email: authState.admin.email, role: authState.admin.role, expires_at: authState.expires_at }) : json({ authenticated: false }, 401);

    if (request.method === "POST" && path === "/logout") {
      if (!authState) return loginPage(basePath, "Your session has expired.", true);
      const form = await request.formData();
      if (!(await csrfOk(authState, String(form.get("csrf") ?? "")))) return authPage("Request rejected", "<h1>Request rejected</h1><p>Reload and try again.</p>", 403);
      await revokeSession(authState.id);
      await audit("admin_logout", authState.admin.id, clientHash, userAgent, {});
      const headers = authCookies(url, "", "", 0);
      headers.set("location", basePath || "/");
      return new Response(null, { status: 303, headers });
    }

    if (request.method === "GET" && path === "/change-password") {
      if (!authState) return loginPage(basePath, "Please sign in to continue.", true);
      return authPage("Change password", `<h1>Change password</h1><p>Verify the current password before choosing a new one.</p><form method="post" action="${basePath}/change-password"><input type="hidden" name="csrf" value="${esc(authState.csrf)}"><div class="field"><label for="current">Current password</label><input id="current" name="current" type="password" autocomplete="current-password" maxlength="256" required></div><div class="field"><label for="next">New password</label><input id="next" name="next" type="password" autocomplete="new-password" minlength="12" maxlength="256" required></div><div class="field"><label for="confirm">Confirm new password</label><input id="confirm" name="confirm" type="password" autocomplete="new-password" minlength="12" maxlength="256" required></div><div class="actions"><button class="btn" type="submit">Update password</button><a class="btn secondary" href="${basePath || "/"}">Cancel</a></div><p class="muted">Minimum 12 characters with uppercase, lowercase, number and symbol.</p></form>`);
    }

    if (request.method === "POST" && path === "/change-password") {
      if (!authState) return loginPage(basePath, "Your session has expired.", true);
      const form = await request.formData();
      if (!(await csrfOk(authState, String(form.get("csrf") ?? "")))) return authPage("Request rejected", "<h1>Request rejected</h1><p>Reload and try again.</p>", 403);
      const current = String(form.get("current") ?? "");
      const next = String(form.get("next") ?? "");
      const confirm = String(form.get("confirm") ?? "");
      if (next === current || next !== confirm || !strong(next) || !(await changePassword(authState.admin.id, current, next))) {
        await audit("admin_password_change_failed", authState.admin.id, clientHash, userAgent, {});
        return authPage("Password not changed", `<h1>Password not changed</h1><div class="msg error">Current password verification or new-password requirements failed.</div><a class="btn secondary" href="${basePath}/change-password">Try again</a>`, 400);
      }
      await audit("admin_password_changed", authState.admin.id, clientHash, userAgent, {});
      const headers = authCookies(url, "", "", 0);
      headers.set("location", `${basePath}/?password=changed`);
      return new Response(null, { status: 303, headers });
    }

    if (request.method === "GET" && path === "/") {
      if (!authState) {
        const flag = url.searchParams.get("password");
        const message = flag === "changed" ? "Password updated. Sign in again." : flag === "reset" ? "Password reset completed. Sign in with the new password." : "";
        return loginPage(basePath, message, false);
      }
      if (authState.admin.role !== "super_admin") return authPage("Access denied", "<h1>Access denied</h1><p>This administration dashboard requires super administrator authority.</p>", 403);
      const snapshot = await dashboardSnapshot(authState.admin.id);
      if (!snapshot) return authPage("Dashboard unavailable", "<h1>Dashboard unavailable</h1><p>The operational snapshot could not be authorised. Please try again shortly.</p>", 403);
      return dashboardPage(basePath, authState, snapshot);
    }

    return authPage("Not found", "<h1>Not found</h1><p>The requested administration route does not exist.</p>", 404);
  } catch {
    return authPage("Service unavailable", "<h1>Administration unavailable</h1><p>Please try again shortly.</p>", 503);
  }
});
