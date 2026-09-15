import { adminHeader, esc, prettyTime, shell, type AdminSessionView } from "./ui.ts";
import {
  securityAuditContext,
  type SecurityAuditContext,
  type SecurityAuditEvent,
  type SecurityAuditFilters
} from "./security-data.ts";

function infoIcon(): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/></svg>`;
}

function label(value: unknown): string {
  return String(value ?? "")
    .replaceAll(".", " ")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function cleanKey(value: string, max: number): string {
  const normalized = value.trim().toLowerCase();
  return normalized.length <= max && /^[a-z0-9._-]+$/.test(normalized) ? normalized : "";
}

function cleanDate(value: string): string {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return "";
  const parsed = new Date(`${normalized}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? "" : normalized;
}

function auditFilters(params?: URLSearchParams): SecurityAuditFilters {
  const rawPage = Number(params?.get("page") ?? "1");
  const page = Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 20 ? rawPage : 1;
  const rawOutcome = String(params?.get("outcome") ?? "").toLowerCase();
  const outcome = ["success", "failure", "denied"].includes(rawOutcome)
    ? rawOutcome as SecurityAuditFilters["outcome"]
    : "";
  const rawActor = String(params?.get("actor") ?? "all").toLowerCase();
  const actor = ["all", "administrator", "system"].includes(rawActor)
    ? rawActor as SecurityAuditFilters["actor"]
    : "all";
  let fromDate = cleanDate(String(params?.get("from") ?? ""));
  let toDate = cleanDate(String(params?.get("to") ?? ""));
  if (fromDate && toDate) {
    const fromTime = Date.parse(`${fromDate}T00:00:00Z`);
    const toTime = Date.parse(`${toDate}T00:00:00Z`);
    const spanDays = Math.floor((toTime - fromTime) / 86400000);
    if (toTime < fromTime || spanDays > 366) {
      fromDate = "";
      toDate = "";
    }
  }

  return {
    page,
    search: cleanKey(String(params?.get("q") ?? ""), 64),
    action: cleanKey(String(params?.get("action") ?? ""), 128),
    entityType: cleanKey(String(params?.get("entity") ?? ""), 64),
    outcome,
    actor,
    fromDate,
    toDate
  };
}

function auditHref(basePath: string, filters: SecurityAuditFilters, page: number): string {
  const query = new URLSearchParams();
  if (filters.search) query.set("q", filters.search);
  if (filters.action) query.set("action", filters.action);
  if (filters.entityType) query.set("entity", filters.entityType);
  if (filters.outcome) query.set("outcome", filters.outcome);
  if (filters.actor !== "all") query.set("actor", filters.actor);
  if (filters.fromDate) query.set("from", filters.fromDate);
  if (filters.toDate) query.set("to", filters.toDate);
  if (page > 1) query.set("page", String(page));
  const suffix = query.toString();
  return `${basePath}/change-password${suffix ? `?${suffix}` : ""}`;
}

function selected(value: string, expected: string): string {
  return value === expected ? " selected" : "";
}

function eventRows(events: SecurityAuditEvent[]): string {
  if (!events.length) {
    return `<tr><td colspan="6"><div class="empty">No audit events match the current bounded filters.</div></td></tr>`;
  }

  return events.map((event) => {
    const outcome = String(event.outcome || "success");
    const context = [
      event.request_ref ? `Request ${event.request_ref}` : "",
      event.session_ref ? `Session ${event.session_ref}` : "",
      event.has_network_context ? "Network context recorded" : ""
    ].filter(Boolean).join(" · ") || "No additional context";
    const resource = event.entity_ref
      ? `${label(event.entity_type)} · ${event.entity_ref}`
      : label(event.entity_type || "system");

    return `<tr><td><strong class="activity-action">${esc(label(event.action || "event"))}</strong><div class="activity-type">Event ${esc(event.event_ref || "—")} · ${esc(event.source_label || "application")}</div></td><td>${esc(resource)}</td><td><strong>${esc(label(outcome))}</strong></td><td>${esc(event.actor_label || "System / unauthenticated")}</td><td>${esc(context)}</td><td><time datetime="${esc(event.created_at || "")}">${esc(prettyTime(String(event.created_at || "")))}</time></td></tr>`;
  }).join("");
}

function filterForm(basePath: string, filters: SecurityAuditFilters): string {
  return `<form method="get" action="${basePath}/change-password" aria-label="Filter security activity" style="padding:16px 18px;border-bottom:1px solid var(--line);background:var(--surface-subtle)">
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;align-items:end">
<div><label for="audit-q" style="display:block;font-size:10px;font-weight:700;margin-bottom:6px">Search action or area</label><input id="audit-q" name="q" value="${esc(filters.search)}" maxlength="64" pattern="[A-Za-z0-9._-]+" placeholder="admin_login or contact" style="width:100%;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px;background:#fff"></div>
<div><label for="audit-action" style="display:block;font-size:10px;font-weight:700;margin-bottom:6px">Exact action</label><input id="audit-action" name="action" value="${esc(filters.action)}" maxlength="128" pattern="[A-Za-z0-9._-]+" placeholder="admin_login_failed" style="width:100%;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px;background:#fff"></div>
<div><label for="audit-entity" style="display:block;font-size:10px;font-weight:700;margin-bottom:6px">Resource area</label><input id="audit-entity" name="entity" value="${esc(filters.entityType)}" maxlength="64" pattern="[A-Za-z0-9._-]+" placeholder="authentication" style="width:100%;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px;background:#fff"></div>
<div><label for="audit-outcome" style="display:block;font-size:10px;font-weight:700;margin-bottom:6px">Outcome</label><select id="audit-outcome" name="outcome" style="width:100%;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px;background:#fff"><option value="">All outcomes</option><option value="success"${selected(filters.outcome, "success")}>Success</option><option value="failure"${selected(filters.outcome, "failure")}>Failure</option><option value="denied"${selected(filters.outcome, "denied")}>Denied</option></select></div>
<div><label for="audit-actor" style="display:block;font-size:10px;font-weight:700;margin-bottom:6px">Actor</label><select id="audit-actor" name="actor" style="width:100%;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px;background:#fff"><option value="all"${selected(filters.actor, "all")}>All actors</option><option value="administrator"${selected(filters.actor, "administrator")}>Administrator</option><option value="system"${selected(filters.actor, "system")}>System / unauthenticated</option></select></div>
<div><label for="audit-from" style="display:block;font-size:10px;font-weight:700;margin-bottom:6px">From date</label><input id="audit-from" name="from" type="date" value="${esc(filters.fromDate)}" style="width:100%;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px;background:#fff"></div>
<div><label for="audit-to" style="display:block;font-size:10px;font-weight:700;margin-bottom:6px">To date</label><input id="audit-to" name="to" type="date" value="${esc(filters.toDate)}" style="width:100%;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px;background:#fff"></div>
<div class="actions" style="margin:0"><button class="btn" type="submit">Apply filters</button><a class="btn secondary" href="${basePath}/change-password">Reset</a></div>
</div><p class="muted" style="margin:10px 0 0">Search is prefix-only across stable action and resource keys. Date boundaries use Europe/London. Invalid or overlong date ranges are safely reset. The server caps the viewer at 20 pages × 25 rows.</p></form>`;
}

function securityActivity(
  basePath: string,
  context: SecurityAuditContext | null,
  filters: SecurityAuditFilters,
  unavailable: boolean
): string {
  if (unavailable || !context) {
    return `<section class="activity-plane" aria-labelledby="activity-title"><header class="section-header"><div><h2 id="activity-title">Security activity</h2><p>The bounded audit projection is temporarily unavailable. Account controls remain available.</p></div><span class="section-meta">Unavailable</span></header><div class="empty">No audit payload was exposed to the browser because the server-authorized projection could not be verified.</div></section>`;
  }

  const events = context.events;
  const deniedCount = events.filter((event) => String(event.outcome) === "denied").length;
  const failureCount = events.filter((event) => String(event.outcome) === "failure").length;
  const systemCount = events.filter((event) => String(event.actor_label || "").startsWith("System")).length;
  const previous = context.has_previous
    ? `<a class="btn secondary" href="${esc(auditHref(basePath, filters, context.page - 1))}">Previous page</a>`
    : "";
  const next = context.has_next
    ? `<a class="btn secondary" href="${esc(auditHref(basePath, filters, context.page + 1))}">Next page</a>`
    : "";

  return `<section class="activity-plane" aria-labelledby="activity-title"><header class="section-header"><div><h2 id="activity-title">Security activity</h2><p>Server-authorized, redacted and append-only audit visibility. The browser never receives raw IP hashes, user agents, metadata, before/after JSON, full internal UUIDs, message bodies or document content.</p></div><span class="section-meta">Page ${context.page} of max ${context.max_page} · 25 rows</span></header>
${filterForm(basePath, filters)}
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));border-bottom:1px solid var(--line)"><div style="padding:14px 18px;border-right:1px solid var(--line)"><span class="metric-label">Denied on this page</span><strong style="display:block;margin-top:5px;font-size:22px;color:var(--ink)">${deniedCount}</strong></div><div style="padding:14px 18px;border-right:1px solid var(--line)"><span class="metric-label">Failures on this page</span><strong style="display:block;margin-top:5px;font-size:22px;color:var(--ink)">${failureCount}</strong></div><div style="padding:14px 18px"><span class="metric-label">System events on this page</span><strong style="display:block;margin-top:5px;font-size:22px;color:var(--ink)">${systemCount}</strong></div></div>
<div class="activity-wrap" tabindex="0" aria-label="Filtered security activity table"><table class="activity-table" style="min-width:1180px;table-layout:auto"><thead><tr><th scope="col">Event</th><th scope="col">Resource</th><th scope="col">Outcome</th><th scope="col">Actor</th><th scope="col">Context</th><th scope="col">Time</th></tr></thead><tbody>${eventRows(events)}</tbody></table></div>
<nav aria-label="Security activity pagination" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-top:1px solid var(--line)"><div class="muted">Page ${context.page} · ${events.length} visible event${events.length === 1 ? "" : "s"}. ${context.has_next ? "More matching events are available within the bounded viewer." : "No later page is available for these filters."}</div><div class="actions" style="margin:0">${previous}${next}</div></nav>
</section>`;
}

export async function securityPage(
  basePath: string,
  session: AdminSessionView,
  message = "",
  error = false,
  status = 200,
  query?: URLSearchParams
): Promise<Response> {
  const notice = message
    ? `<div class="msg ${error ? "error" : "ok"}" role="status">${esc(message)}</div>`
    : "";
  const filters = auditFilters(query);

  let auditContext: SecurityAuditContext | null = null;
  let auditUnavailable = false;
  try {
    const adminId = String((session as any)?.admin?.id ?? "");
    auditContext = await securityAuditContext(adminId, filters);
  } catch {
    auditUnavailable = true;
  }

  return shell("Security", `<div class="admin-shell">
${adminHeader(basePath, session, "security")}
<div class="workspace-bar"><div class="workspace-bar-inner"><div class="workspace-context"><strong>Administration</strong><span class="workspace-divider"></span><span>Security &amp; access</span></div><div class="workspace-state"><strong>Protected workspace</strong> · Server-authoritative</div></div></div>
<main class="workspace" id="main-content" aria-labelledby="security-title">
<div class="page-heading"><div><div class="eyebrow">Identity &amp; access</div><h1 id="security-title">Security &amp; access</h1><p>Account controls, session authority and bounded security activity for the RC IT Services administration workspace.</p></div><div class="snapshot"><strong>Active session</strong>${esc(prettyTime(session.expires_at))}<br>Europe/London</div></div>
<div class="operations-frame">
<section class="data-plane" aria-labelledby="password-title"><header class="section-header"><div><h2 id="password-title">Change administrator password</h2><p>Current-password verification is required. A successful change revokes the active session.</p></div><span class="section-meta">Credential control</span></header><div style="padding:22px;max-width:720px">${notice}<form method="post" action="${basePath}/change-password"><input type="hidden" name="csrf" value="${esc(session.csrf)}"><div class="field"><label for="current">Current password</label><input id="current" name="current" type="password" autocomplete="current-password" maxlength="256" required></div><div class="field"><label for="next">New password</label><input id="next" name="next" type="password" autocomplete="new-password" minlength="12" maxlength="256" required></div><div class="field"><label for="confirm">Confirm new password</label><input id="confirm" name="confirm" type="password" autocomplete="new-password" minlength="12" maxlength="256" required></div><div class="actions"><button class="btn" type="submit">Update password</button><a class="btn secondary" href="${basePath || "/"}">Cancel</a></div><p class="muted">Minimum 12 characters with uppercase, lowercase, number and symbol.</p></form></div></section>
<aside class="side-plane" aria-label="Security status"><section class="side-section" aria-labelledby="identity-title"><div class="side-title"><h2 id="identity-title">Account authority</h2><span>Verified session</span></div><div class="identity-list"><div class="identity-row"><span>Account</span><strong>${esc(session.admin.email)}</strong></div><div class="identity-row"><span>Role</span><strong class="role-text">${esc(session.admin.role)}</strong></div><div class="identity-row"><span>Session expires</span><strong>${esc(prettyTime(session.expires_at))}</strong></div></div></section><section class="side-section" aria-labelledby="controls-title"><div class="side-title"><h3 id="controls-title">Security controls</h3><span>Protected</span></div><div class="readonly-note">${infoIcon()}<span>Authentication, password verification, CSRF validation, session revocation and audit projection authority are enforced server-side. Recruitment publishing is managed from the Jobs workspace. Audit filtering never grants browser database access.</span></div><div class="side-actions"><a class="btn secondary" href="${basePath || "/"}">Return to overview</a><a class="btn secondary" href="${basePath}/jobs">Open job management</a></div></section></aside>
</div>
${securityActivity(basePath, auditContext, filters, auditUnavailable)}
<div class="footerline"><span>RC IT Services · Private administration</span><span>No-cache · No-index · Server-authoritative · Audit payload redacted</span></div>
</main></div>`, status);
}
