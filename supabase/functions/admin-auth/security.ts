import { adminHeader, esc, prettyTime, shell, type AdminSessionView } from "./ui.ts";

function infoIcon(): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/></svg>`;
}

export function securityPage(basePath: string, session: AdminSessionView, message = "", error = false, status = 200): Response {
  const notice = message
    ? `<div class="msg ${error ? "error" : "ok"}" role="status">${esc(message)}</div>`
    : "";

  return shell("Security", `<div class="admin-shell">
${adminHeader(basePath, session, "security")}
<div class="workspace-bar"><div class="workspace-bar-inner"><div class="workspace-context"><strong>Administration</strong><span class="workspace-divider"></span><span>Security &amp; access</span></div><div class="workspace-state"><strong>Protected workspace</strong> · Server-authoritative</div></div></div>
<main class="workspace" id="main-content" aria-labelledby="security-title">
<div class="page-heading"><div><div class="eyebrow">Identity &amp; access</div><h1 id="security-title">Security &amp; access</h1><p>Account controls and session authority for the RC IT Services administration workspace.</p></div><div class="snapshot"><strong>Active session</strong>${esc(prettyTime(session.expires_at))}<br>Europe/London</div></div>
<div class="operations-frame">
<section class="data-plane" aria-labelledby="password-title"><header class="section-header"><div><h2 id="password-title">Change administrator password</h2><p>Current-password verification is required. A successful change revokes the active session.</p></div><span class="section-meta">Credential control</span></header><div style="padding:22px;max-width:720px">${notice}<form method="post" action="${basePath}/change-password"><input type="hidden" name="csrf" value="${esc(session.csrf)}"><div class="field"><label for="current">Current password</label><input id="current" name="current" type="password" autocomplete="current-password" maxlength="256" required></div><div class="field"><label for="next">New password</label><input id="next" name="next" type="password" autocomplete="new-password" minlength="12" maxlength="256" required></div><div class="field"><label for="confirm">Confirm new password</label><input id="confirm" name="confirm" type="password" autocomplete="new-password" minlength="12" maxlength="256" required></div><div class="actions"><button class="btn" type="submit">Update password</button><a class="btn secondary" href="${basePath || "/"}">Cancel</a></div><p class="muted">Minimum 12 characters with uppercase, lowercase, number and symbol.</p></form></div></section>
<aside class="side-plane" aria-label="Security status"><section class="side-section" aria-labelledby="identity-title"><div class="side-title"><h2 id="identity-title">Account authority</h2><span>Verified session</span></div><div class="identity-list"><div class="identity-row"><span>Account</span><strong>${esc(session.admin.email)}</strong></div><div class="identity-row"><span>Role</span><strong class="role-text">${esc(session.admin.role)}</strong></div><div class="identity-row"><span>Session expires</span><strong>${esc(prettyTime(session.expires_at))}</strong></div></div></section><section class="side-section" aria-labelledby="controls-title"><div class="side-title"><h3 id="controls-title">Security controls</h3><span>Protected</span></div><div class="readonly-note">${infoIcon()}<span>Authentication, password verification, CSRF validation and session revocation are enforced server-side. Recruitment publishing is managed from the Jobs workspace.</span></div><div class="side-actions"><a class="btn secondary" href="${basePath || "/"}">Return to overview</a><a class="btn secondary" href="${basePath}/jobs">Open job management</a></div></section></aside>
</div>
<div class="footerline"><span>RC IT Services · Private administration</span><span>No-cache · No-index · Server-authoritative</span></div>
</main></div>`, status);
}
