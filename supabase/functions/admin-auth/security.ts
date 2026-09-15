import { adminHeader, esc, prettyTime, shell, type AdminSessionView } from "./ui.ts";
import { securityAuditContext, type SecurityAuditEvent } from "./security-data.ts";

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

function eventRows(events: SecurityAuditEvent[]): string {
  if (!events.length) {
    return `<tr><td colspan="6"><div class="empty">No events are present in this bounded view.</div></td></tr>`;
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

function auditTable(title: string, description: string, events: SecurityAuditEvent[], open = false): string {
  return `<details${open ? " open" : ""} style="border-bottom:1px solid var(--line)"><summary style="cursor:pointer;padding:14px 18px;font-size:11px;font-weight:700;color:var(--ink);background:var(--surface-subtle)">${esc(title)} <span style="font-weight:500;color:var(--quiet)">· ${events.length} events</span></summary><div style="padding:0 18px 12px"><p class="muted" style="margin:12px 0">${esc(description)}</p><div class="activity-wrap" tabindex="0" aria-label="${esc(title)} audit activity table"><table class="activity-table" style="min-width:1180px;table-layout:auto"><thead><tr><th>Event</th><th>Resource</th><th>Outcome</th><th>Actor</th><th>Context</th><th>Time</th></tr></thead><tbody>${eventRows(events)}</tbody></table></div></div></details>`;
}

function securityActivity(events: SecurityAuditEvent[], hasOlder: boolean, unavailable: boolean): string {
  if (unavailable) {
    return `<section class="activity-plane" aria-labelledby="activity-title"><header class="section-header"><div><h2 id="activity-title">Security activity</h2><p>The bounded audit projection is temporarily unavailable. Account controls remain available.</p></div><span class="section-meta">Unavailable</span></header><div class="empty">No audit payload was exposed to the browser because the server-authorized projection could not be verified.</div></section>`;
  }

  const denied = events.filter((event) => ["failure", "denied"].includes(String(event.outcome || ""))).slice(0, 25);
  const identity = events.filter((event) => ["authentication", "admin_session"].includes(String(event.entity_type || ""))).slice(0, 25);
  const operational = events.filter((event) => !["authentication", "admin_session"].includes(String(event.entity_type || ""))).slice(0, 25);
  const pages: SecurityAuditEvent[][] = [];
  for (let index = 0; index < events.length; index += 25) pages.push(events.slice(index, index + 25));

  const deniedCount = events.filter((event) => String(event.outcome) === "denied").length;
  const failureCount = events.filter((event) => String(event.outcome) === "failure").length;
  const systemCount = events.filter((event) => String(event.actor_label || "").startsWith("System")).length;

  const pagesHtml = pages.length
    ? pages.map((page, index) => auditTable(
        `Recent ledger page ${index + 1}`,
        `Events ${index * 25 + 1}–${index * 25 + page.length} of the bounded ${events.length}-event server projection.`,
        page,
        index === 0
      )).join("")
    : `<div class="empty">No security activity is recorded.</div>`;

  return `<section class="activity-plane" aria-labelledby="activity-title"><header class="section-header"><div><h2 id="activity-title">Security activity</h2><p>Server-authorized, redacted and append-only audit visibility. The browser never receives raw IP hashes, user agents, metadata, before/after JSON, full internal UUIDs, message bodies or document content.</p></div><span class="section-meta">Latest ${events.length} · max 100</span></header><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));border-bottom:1px solid var(--line)"><div style="padding:14px 18px;border-right:1px solid var(--line)"><span class="metric-label">Denied</span><strong style="display:block;margin-top:5px;font-size:22px;color:var(--ink)">${deniedCount}</strong></div><div style="padding:14px 18px;border-right:1px solid var(--line)"><span class="metric-label">Failures</span><strong style="display:block;margin-top:5px;font-size:22px;color:var(--ink)">${failureCount}</strong></div><div style="padding:14px 18px"><span class="metric-label">System / unauthenticated</span><strong style="display:block;margin-top:5px;font-size:22px;color:var(--ink)">${systemCount}</strong></div></div><div style="padding:14px 18px;border-bottom:1px solid var(--line)"><div class="eyebrow" style="margin-bottom:8px">Structured review views</div><p class="muted" style="margin:0">These bounded views replace unrestricted free-text audit export/search. They keep security investigation useful without exposing arbitrary stored payloads.</p></div>${auditTable("Denied and failed events", "Security-relevant exceptions from the current bounded projection.", denied)}${auditTable("Authentication and sessions", "Identity, authentication and administrator-session events.", identity)}${auditTable("Operational administration", "Jobs, candidate, contact and other administrative operations.", operational)}<div style="padding:14px 18px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)"><div class="eyebrow" style="margin-bottom:8px">Recent ledger pages</div><p class="muted" style="margin:0">Twenty-five rows per page. ${hasOlder ? "Older events exist in the durable ledger but are intentionally not bulk-exposed through this workspace." : "The current bounded projection contains the complete ledger."}</p></div>${pagesHtml}</section>`;
}

export async function securityPage(basePath: string, session: AdminSessionView, message = "", error = false, status = 200): Promise<Response> {
  const notice = message
    ? `<div class="msg ${error ? "error" : "ok"}" role="status">${esc(message)}</div>`
    : "";

  let auditEvents: SecurityAuditEvent[] = [];
  let hasOlder = false;
  let auditUnavailable = false;
  try {
    const adminId = String((session as any)?.admin?.id ?? "");
    const context = await securityAuditContext(adminId);
    auditEvents = context.events;
    hasOlder = context.has_older;
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
<aside class="side-plane" aria-label="Security status"><section class="side-section" aria-labelledby="identity-title"><div class="side-title"><h2 id="identity-title">Account authority</h2><span>Verified session</span></div><div class="identity-list"><div class="identity-row"><span>Account</span><strong>${esc(session.admin.email)}</strong></div><div class="identity-row"><span>Role</span><strong class="role-text">${esc(session.admin.role)}</strong></div><div class="identity-row"><span>Session expires</span><strong>${esc(prettyTime(session.expires_at))}</strong></div></div></section><section class="side-section" aria-labelledby="controls-title"><div class="side-title"><h3 id="controls-title">Security controls</h3><span>Protected</span></div><div class="readonly-note">${infoIcon()}<span>Authentication, password verification, CSRF validation, session revocation and audit projection authority are enforced server-side.</span></div><div class="side-actions"><a class="btn secondary" href="${basePath || "/"}">Return to overview</a><a class="btn secondary" href="${basePath}/jobs">Open job management</a></div></section></aside>
</div>
${securityActivity(auditEvents, hasOlder, auditUnavailable)}
<div class="footerline"><span>RC IT Services · Private administration</span><span>No-cache · No-index · Server-authoritative · Audit payload redacted</span></div>
</main></div>`, status);
}
