import { authPage, esc, loginPage, prettyTime, shell, type AdminSessionView } from "./ui.ts";

const SUPABASE_URL = String(Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
const LEGACY_SERVICE_ROLE_KEY = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const CANDIDATE_BUCKET = "candidate-documents";
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OBJECT_PATH = /^applications\/([0-9a-f-]{36})\/documents\/([0-9a-f-]{36})\.(pdf|doc|docx)$/i;

let MODERN_SECRET_KEY = "";
try {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    const keys = JSON.parse(raw) as Record<string, unknown>;
    MODERN_SECRET_KEY = String(keys.default ?? Object.values(keys)[0] ?? "");
  }
} catch {
  // Fail closed below if no valid credential is available.
}
const API_KEY = MODERN_SECRET_KEY || LEGACY_SERVICE_ROLE_KEY;
const USING_LEGACY_KEY = !MODERN_SECRET_KEY && Boolean(LEGACY_SERVICE_ROLE_KEY);

function apiHeaders(contentType = "application/json"): Headers {
  if (!SUPABASE_URL || !API_KEY) throw new Error("configuration unavailable");
  const headers = new Headers({ apikey: API_KEY, "content-type": contentType, accept: "application/json" });
  if (USING_LEGACY_KEY) headers.set("authorization", `Bearer ${LEGACY_SERVICE_ROLE_KEY}`);
  return headers;
}

async function rpc(name: string, payload: Record<string, unknown>): Promise<any> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`application admin rpc ${name} failed`);
  const body = await response.json();
  return Array.isArray(body) && body.length === 1 ? body[0] : body;
}

async function auditDownload(adminId: string, applicationId: string, documentId: string, ipHash: string, userAgent: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs`, {
    method: "POST",
    headers: new Headers({ ...Object.fromEntries(apiHeaders()), prefer: "return=minimal" }),
    body: JSON.stringify({
      admin_id: adminId,
      action: "candidate_document_downloaded",
      entity_type: "application_document",
      entity_id: documentId,
      ip_hash: ipHash,
      user_agent: userAgent,
      metadata: { application_id: applicationId, source: "admin_applications" }
    })
  });
  if (!response.ok) throw new Error("document download audit failed");
}

function icon(name: "overview" | "jobs" | "applications" | "security" | "signout"): string {
  if (name === "overview") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h7v6H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 13h7v6H4z"/></svg>`;
  if (name === "jobs") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v12H4zM9 7V5h6v2M4 11h16M10 11v2h4v-2"/></svg>`;
  if (name === "applications") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h8l4 4v14H7zM15 3v5h5M10 12h6M10 16h6"/></svg>`;
  if (name === "security") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 19 6v5c0 4.6-2.7 7.8-7 9.5C7.7 18.8 5 15.6 5 11V6l7-2.5Z"/><path d="m9.2 12 1.8 1.8 3.8-4"/></svg>`;
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M14.5 8.5 18 12l-3.5 3.5M9 12h9"/></svg>`;
}

function header(basePath: string, session: AdminSessionView): string {
  return `<header class="global-header"><div class="global-header-inner"><div class="product-brand"><div class="brandmark" aria-hidden="true">RC</div><div class="brand-copy"><strong>RC IT Services</strong><span>Enterprise Administration</span></div></div><nav class="primary-nav" aria-label="Administration"><a href="${basePath || "/"}">${icon("overview")}<span>Overview</span></a><a href="${basePath}/jobs">${icon("jobs")}<span>Jobs</span></a><a href="${basePath}/applications" aria-current="page">${icon("applications")}<span>Applications</span></a><a href="${basePath}/change-password">${icon("security")}<span>Security</span></a></nav><div class="header-actions"><span class="header-account">${esc(session.admin.email)}</span><form class="header-signout" method="post" action="${basePath}/logout"><input type="hidden" name="csrf" value="${esc(session.csrf)}"><button type="submit" aria-label="Sign out" title="Sign out">${icon("signout")}</button></form><details class="mobile-nav"><summary>Menu</summary><div class="mobile-menu"><a href="${basePath || "/"}">Overview</a><a href="${basePath}/jobs">Jobs</a><a href="${basePath}/applications" aria-current="page">Applications</a><a href="${basePath}/change-password">Security</a><form method="post" action="${basePath}/logout"><input type="hidden" name="csrf" value="${esc(session.csrf)}"><button type="submit">Sign out</button></form></div></details></div></div></header>`;
}

function workspaceBar(label: string): string {
  return `<div class="workspace-bar"><div class="workspace-bar-inner"><div class="workspace-context"><strong>Administration</strong><span class="workspace-divider"></span><span>${esc(label)}</span></div><div class="workspace-state"><strong>Protected workspace</strong> · Private candidate data</div></div></div>`;
}

function badge(status = "submitted"): string {
  const label = status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `<span style="display:inline-flex;align-items:center;min-height:24px;padding:3px 8px;border:1px solid var(--line-strong);border-radius:999px;background:var(--surface-subtle);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">${esc(label)}</span>`;
}

function formatBytes(value: unknown): string {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes < 0) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function candidateName(row: any): string {
  return `${String(row?.first_name ?? "").trim()} ${String(row?.last_name ?? "").trim()}`.trim() || "Candidate";
}

function filterApplications(rows: any[], query: string, status: string): any[] {
  const q = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (status && status !== "all" && String(row.status) !== status) return false;
    if (!q) return true;
    return [candidateName(row), row.email, row.public_reference, row.job_title, row.job_code, row.location]
      .some((value) => String(value ?? "").toLowerCase().includes(q));
  });
}

function listPage(basePath: string, session: AdminSessionView, context: any, query: string, status: string): Response {
  const applications = Array.isArray(context?.applications) ? context.applications : [];
  const visible = filterApplications(applications, query, status);
  const rows = visible.length ? visible.map((row) => `<tr><td><a class="link" href="${basePath}/applications/${esc(row.id)}">${esc(candidateName(row))}</a><div class="activity-type">${esc(row.email || "")}</div></td><td><strong>${esc(row.job_title || "Unknown role")}</strong><div class="activity-type">${esc(row.job_code || "")}</div></td><td>${badge(String(row.status || "submitted"))}</td><td>${esc(row.document_count ?? 0)}</td><td>${esc(row.public_reference || "")}</td><td style="text-align:right"><time datetime="${esc(row.submitted_at || "")}">${esc(prettyTime(String(row.submitted_at || "")))}</time></td></tr>`).join("") : `<tr><td colspan="6"><div class="empty">No applications match this view.</div></td></tr>`;
  return shell("Applications", `<div class="admin-shell">${header(basePath, session)}${workspaceBar("Candidate applications")}<main class="workspace" id="main-content" aria-labelledby="applications-title"><div class="page-heading"><div><div class="eyebrow">Candidate intake</div><h1 id="applications-title">Applications</h1><p>Read-only review of persisted candidate submissions and private recruitment documents. Candidate communication and status workflows are not enabled in this phase.</p></div><div class="snapshot"><strong>${applications.length} persisted applications</strong>Maximum 200 newest records<br>Server-authoritative</div></div><section class="data-plane"><header class="section-header"><div><h2>Application register</h2><p>Every application remains tied to its immutable job snapshot and public reference.</p></div><a class="btn secondary" href="${basePath}/jobs">View jobs</a></header><div style="padding:14px 18px;border-bottom:1px solid var(--line)"><form method="get" action="${basePath}/applications" style="display:grid;grid-template-columns:minmax(220px,1fr) minmax(160px,.35fr) auto;gap:8px;align-items:end"><div><label for="application-search" style="display:block;font-size:10px;font-weight:700;margin-bottom:5px">Search</label><input id="application-search" name="q" value="${esc(query)}" placeholder="Candidate, email, reference, job" style="width:100%;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px"></div><div><label for="application-status" style="display:block;font-size:10px;font-weight:700;margin-bottom:5px">Status</label><select id="application-status" name="status" style="width:100%;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px;background:#fff"><option value="all">All</option>${["submitted","under_review","shortlisted","interview","assessment","offer","hired","rejected","withdrawn","archived"].map((item) => `<option value="${item}"${status === item ? " selected" : ""}>${esc(item.replaceAll("_", " "))}</option>`).join("")}</select></div><button class="btn secondary" type="submit">Filter</button></form></div><div class="activity-wrap"><table class="activity-table" style="min-width:980px;table-layout:auto"><thead><tr><th>Candidate</th><th>Job</th><th>Status</th><th>Docs</th><th>Reference</th><th style="text-align:right">Submitted</th></tr></thead><tbody>${rows}</tbody></table></div></section><div class="footerline"><span>RC IT Services · Private candidate data</span><span>No-cache · No-index · Read-only Phase 12 review</span></div></main></div>`);
}

function detailPage(basePath: string, session: AdminSessionView, selected: any): Response {
  if (!selected) return authPage("Application not found", `<h1>Application not found</h1><p>The requested candidate application does not exist or is outside your authority.</p><a class="btn secondary" href="${basePath}/applications">Back to applications</a>`, 404);
  const documents = Array.isArray(selected.documents) ? selected.documents : [];
  const history = Array.isArray(selected.history) ? selected.history : [];
  const documentRows = documents.length ? documents.map((doc: any) => `<tr><td><strong>${esc(doc.kind === "resume" ? "Resume / CV" : "Cover letter")}</strong></td><td>${esc(doc.original_filename || "document")}</td><td>${esc(doc.mime_type || "")}</td><td>${esc(formatBytes(doc.size_bytes))}</td><td><a class="btn secondary" style="min-height:32px;padding:6px 9px;font-size:10px" href="${basePath}/applications/${esc(selected.id)}/documents/${esc(doc.id)}">Download securely</a></td></tr>`).join("") : `<tr><td colspan="5"><div class="empty">No private documents are recorded for this application.</div></td></tr>`;
  const historyRows = history.length ? history.map((item: any) => `<tr><td>${esc(String(item.event_type || "event").replaceAll("_", " "))}</td><td>${esc(item.from_status || "—")}</td><td>${esc(item.to_status || "—")}</td><td>${esc(prettyTime(String(item.created_at || "")))}</td></tr>`).join("") : `<tr><td colspan="4"><div class="empty">No application history is recorded.</div></td></tr>`;
  const link = (url: unknown, label: string) => String(url || "").startsWith("https://") ? `<a class="link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : "—";
  return shell("Application detail", `<div class="admin-shell">${header(basePath, session)}${workspaceBar("Candidate application detail")}<main class="workspace" id="main-content"><div class="page-heading"><div><div class="eyebrow">${esc(selected.public_reference || "Application")}</div><h1>${esc(candidateName(selected))}</h1><p>${esc(selected.job_title || "Unknown role")} · ${esc(selected.job_code || "")}</p></div><div class="snapshot"><strong>${badge(String(selected.status || "submitted"))}</strong>Submitted ${esc(prettyTime(String(selected.submitted_at || "")))}</div></div><div class="operations-frame"><section class="data-plane"><header class="section-header"><div><h2>Candidate &amp; job record</h2><p>Persisted identity, job snapshot and recruitment consent.</p></div><a class="btn secondary" href="${basePath}/applications">Back to register</a></header><div style="padding:18px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 24px"><div class="identity-row"><span>Email</span><strong>${esc(selected.email || "")}</strong></div><div class="identity-row"><span>Phone</span><strong>${esc(selected.phone || "—")}</strong></div><div class="identity-row"><span>Location</span><strong>${esc(selected.location || "—")}</strong></div><div class="identity-row"><span>Job</span><strong>${esc(selected.job_title || "")}</strong></div><div class="identity-row"><span>Job code</span><strong>${esc(selected.job_code || "")}</strong></div><div class="identity-row"><span>Reference</span><strong>${esc(selected.public_reference || "")}</strong></div><div class="identity-row"><span>LinkedIn</span><strong>${link(selected.linkedin_url, "Open profile")}</strong></div><div class="identity-row"><span>Portfolio</span><strong>${link(selected.portfolio_url, "Open website")}</strong></div><div class="identity-row"><span>Consent</span><strong>${selected.consent === true ? "Recorded" : "Missing"}</strong></div><div class="identity-row"><span>Consent time</span><strong>${esc(prettyTime(String(selected.consent_at || "")))}</strong></div></div>${selected.cover_letter_text ? `<div style="padding:0 18px 18px"><h2 style="font-size:13px;color:var(--ink)">Cover-letter message</h2><div style="white-space:pre-wrap;border-left:3px solid var(--accent);padding:12px 14px;background:var(--surface-subtle);font-size:12px;line-height:1.6">${esc(selected.cover_letter_text)}</div></div>` : ""}</section><aside class="side-plane"><section class="side-section"><div class="side-title"><h2>Phase boundary</h2><span>Read only</span></div><p class="muted">This workspace exposes persisted applications and private documents only. Candidate replies, stage changes and outbound email are intentionally reserved for later phases.</p></section></aside></div><section class="activity-plane"><header class="section-header"><div><h2>Private documents</h2><p>Downloads are streamed through this authenticated administration route; object paths and service credentials are never rendered to the browser.</p></div><span class="section-meta">${documents.length} documents</span></header><div class="activity-wrap"><table class="activity-table" style="min-width:800px;table-layout:auto"><thead><tr><th>Type</th><th>File</th><th>MIME</th><th>Size</th><th>Action</th></tr></thead><tbody>${documentRows}</tbody></table></div></section><section class="activity-plane"><header class="section-header"><div><h2>Application history</h2><p>Persisted recruitment events for this submission.</p></div></header><div class="activity-wrap"><table class="activity-table"><thead><tr><th>Event</th><th>From</th><th>To</th><th>Time</th></tr></thead><tbody>${historyRows}</tbody></table></div></section><div class="footerline"><span>RC IT Services · Private application record</span><span>No-cache · Authenticated retrieval only</span></div></main></div>`);
}

function safeFilename(value: unknown): string {
  const name = String(value || "candidate-document").replace(/[\r\n"\\/]/g, "_").replace(/[^A-Za-z0-9._ -]/g, "_").slice(0, 180).trim();
  return name || "candidate-document";
}

async function documentDownload(adminId: string, applicationId: string, documentId: string, ipHash: string, userAgent: string): Promise<Response> {
  const result = await rpc("get_admin_application_document", {
    p_admin_id: adminId,
    p_application_id: applicationId,
    p_document_id: documentId
  });
  if (result?.ok !== true || !result.document) return authPage("Document not found", "<h1>Document not found</h1><p>The requested private document is unavailable.</p>", 404);
  const doc = result.document;
  const objectPath = String(doc.object_path || "");
  const pathMatch = OBJECT_PATH.exec(objectPath);
  if (String(doc.bucket_id || "") !== CANDIDATE_BUCKET || !pathMatch || pathMatch[1].toLowerCase() !== applicationId.toLowerCase() || pathMatch[2].toLowerCase() !== documentId.toLowerCase()) {
    throw new Error("candidate document authority mismatch");
  }
  const size = Number(doc.size_bytes);
  if (!Number.isSafeInteger(size) || size < 1 || size > MAX_DOCUMENT_BYTES) throw new Error("candidate document size invalid");
  const encoded = objectPath.split("/").map(encodeURIComponent).join("/");
  const upstream = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(CANDIDATE_BUCKET)}/${encoded}`, {
    method: "GET",
    headers: apiHeaders("application/octet-stream"),
    cache: "no-store"
  });
  if (!upstream.ok || !upstream.body) throw new Error("private document unavailable");
  const declared = upstream.headers.get("content-length");
  if (declared !== null && Number(declared) !== size) {
    try { await upstream.body.cancel(); } catch { /* no-op */ }
    throw new Error("private document size mismatch");
  }
  await auditDownload(adminId, applicationId, documentId, ipHash, userAgent);
  const headers = new Headers({
    "content-type": String(doc.mime_type || "application/octet-stream"),
    "content-disposition": `attachment; filename="${safeFilename(doc.original_filename)}"`,
    "content-length": String(size),
    "cache-control": "no-store, max-age=0, must-revalidate",
    pragma: "no-cache",
    expires: "0",
    "x-content-type-options": "nosniff",
    "x-robots-tag": "noindex, nofollow, noarchive",
    "referrer-policy": "no-referrer",
    "cross-origin-resource-policy": "same-origin",
    "content-security-policy": "default-src 'none'; sandbox"
  });
  return new Response(upstream.body, { status: 200, headers });
}

export async function handleApplicationRoute({ request, url, path, basePath, authState, clientHash, userAgent }: any): Promise<Response | null> {
  if (!path.startsWith("/applications")) return null;
  if (!authState) return loginPage(basePath, "Please sign in to continue.", true);
  if (authState.admin.role !== "super_admin") return authPage("Access denied", "<h1>Access denied</h1><p>This application workspace requires super administrator authority.</p>", 403);
  if (request.method !== "GET") {
    const headers = new Headers({ allow: "GET" });
    return authPage("Method not allowed", "<h1>Method not allowed</h1><p>Phase 12 application review is read-only.</p>", 405, headers);
  }
  const adminId = String(authState.admin.id || "");
  if (!UUID.test(adminId)) throw new Error("invalid admin authority");

  if (path === "/applications") {
    const context = await rpc("get_admin_application_management_context", { p_admin_id: adminId, p_application_id: null, p_job_id: null });
    if (context?.ok !== true) return authPage("Access denied", "<h1>Access denied</h1>", 403);
    return listPage(basePath, authState, context, url.searchParams.get("q") || "", url.searchParams.get("status") || "all");
  }

  const detailMatch = /^\/applications\/([0-9a-f-]{36})$/i.exec(path);
  if (detailMatch && UUID.test(detailMatch[1])) {
    const context = await rpc("get_admin_application_management_context", { p_admin_id: adminId, p_application_id: detailMatch[1], p_job_id: null });
    if (context?.ok !== true) return authPage("Access denied", "<h1>Access denied</h1>", 403);
    return detailPage(basePath, authState, context.selected);
  }

  const documentMatch = /^\/applications\/([0-9a-f-]{36})\/documents\/([0-9a-f-]{36})$/i.exec(path);
  if (documentMatch && UUID.test(documentMatch[1]) && UUID.test(documentMatch[2])) {
    return documentDownload(adminId, documentMatch[1], documentMatch[2], clientHash, userAgent);
  }

  return authPage("Not found", "<h1>Not found</h1><p>The requested application route does not exist.</p>", 404);
}
