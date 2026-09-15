import { shaHex } from "./crypto.js";
import { adminHeader, authPage, esc, loginPage, prettyTime, privateHeaders, shell, type AdminSessionView } from "./ui.ts";
import {
  CANDIDATE_MESSAGE_BODY_MAX,
  CANDIDATE_MESSAGE_SUBJECT_MAX,
  candidateCommunicationCount,
  renderCandidateCommunicationHistory,
  renderCandidateMessageComposer
} from "./candidate-communication.ts";

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

async function csrfOk(state: any, submitted: string): Promise<boolean> {
  return Boolean(submitted) && submitted === state.csrf && await shaHex(submitted) === state.csrf_token_hash;
}

function redirect(location: string): Response {
  const headers = privateHeaders();
  headers.set("location", location);
  return new Response(null, { status: 303, headers });
}

async function dispatchQueuedEmail(emailLogId: string): Promise<boolean> {
  if (!SUPABASE_URL || !API_KEY || !UUID.test(emailLogId)) return false;
  try {
    const headers = new Headers({
      apikey: API_KEY,
      authorization: `Bearer ${API_KEY}`,
      "content-type": "application/json",
      accept: "application/json"
    });
    const response = await fetch(`${SUPABASE_URL}/functions/v1/transactional-email/dispatch`, {
      method: "POST",
      headers,
      body: JSON.stringify({ emailLogId }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return false;
    const body = await response.json().catch(() => null);
    return body?.ok === true;
  } catch {
    return false;
  }
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

function messageNotice(url: URL): { message: string; error: boolean } {
  const notice = url.searchParams.get("notice");
  const error = url.searchParams.get("error");
  if (notice === "message_sent") return { message: "Candidate email was persisted and delivery was confirmed by the transactional email service.", error: false };
  if (notice === "message_queued") return { message: "Candidate email was persisted. No new immediate delivery confirmation was received; the recorded delivery state and transactional retry scheduler remain authoritative.", error: false };
  if (error === "archived") return { message: "Restore the application before contacting this candidate.", error: true };
  if (error === "invalid_recipient") return { message: "The persisted candidate email address is not valid for outbound delivery.", error: true };
  if (error === "validation") return { message: "The candidate message did not pass server-side validation.", error: true };
  if (error === "conflict") return { message: "This message request conflicts with an existing idempotent operation. Reload the application before retrying.", error: true };
  if (error === "forbidden") return { message: "Your administrator session is not authorized for this operation.", error: true };
  if (error === "not_found") return { message: "The candidate application no longer exists.", error: true };
  if (error) return { message: "The candidate message could not be queued. No delivery success was recorded.", error: true };
  return { message: "", error: false };
}

function mutationErrorCode(code: unknown): string {
  const map: Record<string, string> = {
    ARCHIVED: "archived",
    INVALID_RECIPIENT: "invalid_recipient",
    VALIDATION: "validation",
    IDEMPOTENCY_CONFLICT: "conflict",
    FORBIDDEN: "forbidden",
    NOT_FOUND: "not_found"
  };
  return map[String(code || "")] || "failed";
}

function listPage(basePath: string, session: AdminSessionView, context: any, query: string, status: string): Response {
  const applications = Array.isArray(context?.applications) ? context.applications : [];
  const visible = filterApplications(applications, query, status);
  const rows = visible.length ? visible.map((row) => `<tr><td><a class="link" href="${basePath}/applications/${esc(row.id)}">${esc(candidateName(row))}</a><div class="activity-type">${esc(row.email || "")}</div></td><td><strong>${esc(row.job_title || "Unknown role")}</strong><div class="activity-type">${esc(row.job_code || "")}</div></td><td>${badge(String(row.status || "submitted"))}</td><td>${esc(row.document_count ?? 0)}</td><td>${esc(row.public_reference || "")}</td><td style="text-align:right"><time datetime="${esc(row.submitted_at || "")}">${esc(prettyTime(String(row.submitted_at || "")))}</time></td></tr>`).join("") : `<tr><td colspan="6"><div class="empty">No applications match this view.</div></td></tr>`;
  return shell("Applications", `<div class="admin-shell">${adminHeader(basePath, session, "applications")}${workspaceBar("Candidate applications")}<main class="workspace" id="main-content" aria-labelledby="applications-title"><div class="page-heading"><div><div class="eyebrow">Candidate intake</div><h1 id="applications-title">Applications</h1><p>Review persisted candidate submissions, private recruitment documents and recorded communication.</p></div><div class="snapshot"><strong>${applications.length} persisted applications</strong>Maximum 200 newest records<br>Server-authoritative</div></div><section class="data-plane"><header class="section-header"><div><h2>Application register</h2><p>Every application remains tied to its immutable job snapshot and public reference.</p></div><a class="btn secondary" href="${basePath}/jobs">View jobs</a></header><div style="padding:14px 18px;border-bottom:1px solid var(--line)"><form method="get" action="${basePath}/applications" style="display:grid;grid-template-columns:minmax(220px,1fr) minmax(160px,.35fr) auto;gap:8px;align-items:end"><div><label for="application-search" style="display:block;font-size:10px;font-weight:700;margin-bottom:5px">Search</label><input id="application-search" name="q" value="${esc(query)}" placeholder="Candidate, email, reference, job" style="width:100%;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px"></div><div><label for="application-status" style="display:block;font-size:10px;font-weight:700;margin-bottom:5px">Status</label><select id="application-status" name="status" style="width:100%;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px;background:#fff"><option value="all">All</option>${["submitted","under_review","shortlisted","interview","assessment","offer","hired","rejected","withdrawn","archived"].map((item) => `<option value="${item}"${status === item ? " selected" : ""}>${esc(item.replaceAll("_", " "))}</option>`).join("")}</select></div><button class="btn secondary" type="submit">Filter</button></form></div><div class="activity-wrap"><table class="activity-table" style="min-width:980px;table-layout:auto"><thead><tr><th>Candidate</th><th>Job</th><th>Status</th><th>Docs</th><th>Reference</th><th style="text-align:right">Submitted</th></tr></thead><tbody>${rows}</tbody></table></div></section><div class="footerline"><span>RC IT Services · Private candidate data</span><span>No-cache · No-index · Authenticated administration</span></div></main></div>`);
}

function detailPage(basePath: string, session: AdminSessionView, selected: any, communication: any, url: URL, draft: any = {}): Response {
  if (!selected) return authPage("Application not found", `<h1>Application not found</h1><p>The requested candidate application does not exist or is outside your authority.</p><a class="btn secondary" href="${basePath}/applications">Back to applications</a>`, 404);
  const documents = Array.isArray(selected.documents) ? selected.documents : [];
  const history = Array.isArray(selected.history) ? selected.history : [];
  const messages = Array.isArray(communication?.messages) ? communication.messages : [];
  const messageCount = candidateCommunicationCount(messages);
  const notice = messageNotice(url);
  const noticeHtml = notice.message ? `<div class="msg ${notice.error ? "error" : "ok"}" role="status">${esc(notice.message)}</div>` : "";
  const documentRows = documents.length ? documents.map((doc: any) => `<tr><td><strong>${esc(doc.kind === "resume" ? "Resume / CV" : "Cover letter")}</strong></td><td>${esc(doc.original_filename || "document")}</td><td>${esc(doc.mime_type || "")}</td><td>${esc(formatBytes(doc.size_bytes))}</td><td><a class="btn secondary" style="min-height:32px;padding:6px 9px;font-size:10px" href="${basePath}/applications/${esc(selected.id)}/documents/${esc(doc.id)}">Download securely</a></td></tr>`).join("") : `<tr><td colspan="5"><div class="empty">No private documents are recorded for this application.</div></td></tr>`;
  const historyRows = history.length ? history.map((item: any) => `<tr><td>${esc(String(item.event_type || "event").replaceAll("_", " "))}</td><td>${esc(item.from_status || "—")}</td><td>${esc(item.to_status || "—")}</td><td>${esc(prettyTime(String(item.created_at || "")))}</td></tr>`).join("") : `<tr><td colspan="4"><div class="empty">No application history is recorded.</div></td></tr>`;
  const link = (value: unknown, label: string) => String(value || "").startsWith("https://") ? `<a class="link" href="${esc(value)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : "—";
  return shell("Application detail", `<div class="admin-shell">${adminHeader(basePath, session, "applications")}${workspaceBar("Candidate application detail")}<main class="workspace" id="main-content"><div class="page-heading"><div><div class="eyebrow">${esc(selected.public_reference || "Application")}</div><h1>${esc(candidateName(selected))}</h1><p>${esc(selected.job_title || "Unknown role")} · ${esc(selected.job_code || "")}</p></div><div class="snapshot"><strong>${badge(String(selected.status || "submitted"))}</strong>Submitted ${esc(prettyTime(String(selected.submitted_at || "")))}</div></div>${noticeHtml}<div class="operations-frame"><section class="data-plane"><header class="section-header"><div><h2>Candidate &amp; job record</h2><p>Persisted identity, job snapshot and recruitment consent.</p></div><a class="btn secondary" href="${basePath}/applications">Back to register</a></header><div style="padding:18px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 24px"><div class="identity-row"><span>Email</span><strong>${esc(selected.email || "")}</strong></div><div class="identity-row"><span>Phone</span><strong>${esc(selected.phone || "—")}</strong></div><div class="identity-row"><span>Location</span><strong>${esc(selected.location || "—")}</strong></div><div class="identity-row"><span>Job</span><strong>${esc(selected.job_title || "")}</strong></div><div class="identity-row"><span>Job code</span><strong>${esc(selected.job_code || "")}</strong></div><div class="identity-row"><span>Reference</span><strong>${esc(selected.public_reference || "")}</strong></div><div class="identity-row"><span>LinkedIn</span><strong>${link(selected.linkedin_url, "Open profile")}</strong></div><div class="identity-row"><span>Portfolio</span><strong>${link(selected.portfolio_url, "Open website")}</strong></div><div class="identity-row"><span>Consent</span><strong>${selected.consent === true ? "Recorded" : "Missing"}</strong></div><div class="identity-row"><span>Consent time</span><strong>${esc(prettyTime(String(selected.consent_at || "")))}</strong></div></div>${selected.cover_letter_text ? `<div style="padding:0 18px 18px"><h2 style="font-size:13px;color:var(--ink)">Cover-letter message</h2><div style="white-space:pre-wrap;border-left:3px solid var(--accent);padding:12px 14px;background:var(--surface-subtle);font-size:12px;line-height:1.6">${esc(selected.cover_letter_text)}</div></div>` : ""}</section><aside class="side-plane"><section class="side-section"><div class="side-title"><h2>Communication</h2><span>${esc(messageCount)} recorded</span></div><p class="muted">Outbound email is previewed before confirmation, then persisted and queued server-side before any provider dispatch is attempted.</p></section></aside></div><section class="data-plane" aria-labelledby="candidate-message-compose-title" style="margin-top:14px"><header class="section-header"><div><h2 id="candidate-message-compose-title">Compose candidate email</h2><p>The recipient comes from the persisted application record. Sender, reply-to and provider are server-controlled.</p></div><span class="section-meta">Preview required</span></header><div style="padding:18px">${renderCandidateMessageComposer(basePath, String(session.csrf || ""), selected, draft)}</div></section><section class="activity-plane" aria-labelledby="candidate-communication-title"><header class="section-header"><div><h2 id="candidate-communication-title">Candidate communication</h2><p>Bounded history of persisted recruitment email. Delivery state is correlated with the transactional email queue; raw provider errors are not exposed here.</p></div><span class="section-meta">Latest ${esc(messageCount)} of 100 maximum</span></header><div style="padding:0 18px">${renderCandidateCommunicationHistory(messages)}</div></section><section class="activity-plane"><header class="section-header"><div><h2>Private documents</h2><p>Downloads are streamed through this authenticated administration route; object paths and service credentials are never rendered to the browser.</p></div><span class="section-meta">${documents.length} documents</span></header><div class="activity-wrap"><table class="activity-table" style="min-width:800px;table-layout:auto"><thead><tr><th>Type</th><th>File</th><th>MIME</th><th>Size</th><th>Action</th></tr></thead><tbody>${documentRows}</tbody></table></div></section><section class="activity-plane"><header class="section-header"><div><h2>Application history</h2><p>Persisted recruitment events for this submission.</p></div></header><div class="activity-wrap"><table class="activity-table"><thead><tr><th>Event</th><th>From</th><th>To</th><th>Time</th></tr></thead><tbody>${historyRows}</tbody></table></div></section><div class="footerline"><span>RC IT Services · Private application record</span><span>No-cache · Authenticated retrieval only</span></div></main></div>`);
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

async function applicationDetailContext(adminId: string, applicationId: string): Promise<{ context: any; communication: any }> {
  const [context, communication] = await Promise.all([
    rpc("get_admin_application_management_context", { p_admin_id: adminId, p_application_id: applicationId, p_job_id: null }),
    rpc("get_admin_candidate_communication_context", { p_admin_id: adminId, p_application_id: applicationId, p_limit: 100 })
  ]);
  return { context, communication };
}

export async function handleApplicationRoute({ request, url, path, basePath, authState, clientHash, userAgent }: any): Promise<Response | null> {
  if (!path.startsWith("/applications")) return null;
  if (!authState) return loginPage(basePath, "Please sign in to continue.", true);
  if (authState.admin.role !== "super_admin") return authPage("Access denied", "<h1>Access denied</h1><p>This application workspace requires super administrator authority.</p>", 403);
  const adminId = String(authState.admin.id || "");
  if (!UUID.test(adminId)) throw new Error("invalid admin authority");

  const messageMatch = /^\/applications\/([0-9a-f-]{36})\/message$/i.exec(path);
  if (request.method === "POST") {
    if (!messageMatch || !UUID.test(messageMatch[1])) {
      const headers = new Headers({ allow: "GET" });
      return authPage("Method not allowed", "<h1>Method not allowed</h1><p>This application route does not support mutations.</p>", 405, headers);
    }

    const applicationId = messageMatch[1].toLowerCase();
    const form = await request.formData();
    if (!(await csrfOk(authState, String(form.get("csrf") ?? "")))) {
      return authPage("Request rejected", "<h1>Request rejected</h1><p>Reload the candidate application and try again.</p>", 403);
    }

    const requestId = String(form.get("request_id") ?? "").trim().toLowerCase();
    const intent = String(form.get("intent") ?? "").trim().toLowerCase();
    const subject = String(form.get("subject") ?? "").trim();
    const body = String(form.get("body") ?? "").trim();
    const validMessage = UUID.test(requestId)
      && (intent === "preview" || intent === "send")
      && subject.length >= 1
      && subject.length <= CANDIDATE_MESSAGE_SUBJECT_MAX
      && !/[\r\n]/.test(subject)
      && body.length >= 1
      && body.length <= CANDIDATE_MESSAGE_BODY_MAX;

    const { context, communication } = await applicationDetailContext(adminId, applicationId);
    if (context?.ok !== true || communication?.ok !== true || !context.selected) {
      return authPage("Application not found", "<h1>Application not found</h1><p>The requested candidate application is unavailable.</p>", 404);
    }

    if (!validMessage) {
      return detailPage(basePath, authState, context.selected, communication, url, {
        subject,
        body,
        requestId: UUID.test(requestId) ? requestId : crypto.randomUUID(),
        preview: false,
        validationError: "Enter a subject of 1–300 characters without line breaks and a message of 1–10,000 characters."
      });
    }

    if (intent === "preview") {
      return detailPage(basePath, authState, context.selected, communication, url, {
        subject,
        body,
        requestId,
        preview: true
      });
    }

    const result = await rpc("admin_queue_candidate_message", {
      p_admin_id: adminId,
      p_application_id: applicationId,
      p_request_id: requestId,
      p_subject: subject,
      p_body: body,
      p_ip_hash: String(clientHash || "").slice(0, 128),
      p_user_agent: String(userAgent || "").slice(0, 500)
    });
    if (!result || result.ok !== true) {
      return redirect(`${basePath}/applications/${applicationId}?error=${mutationErrorCode(result?.code)}`);
    }
    const emailLogId = String(result.email_log_id || "");
    const terminalDelivery = result.duplicate === true && ["sent", "delivered"].includes(String(result.delivery_status || "").toLowerCase());
    const delivered = terminalDelivery || await dispatchQueuedEmail(emailLogId);
    return redirect(`${basePath}/applications/${applicationId}?notice=${delivered ? "message_sent" : "message_queued"}`);
  }

  if (request.method !== "GET") {
    const headers = new Headers({ allow: "GET, POST" });
    return authPage("Method not allowed", "<h1>Method not allowed</h1><p>This application route supports only protected GET or POST operations.</p>", 405, headers);
  }

  if (messageMatch) {
    const headers = new Headers({ allow: "POST" });
    return authPage("Method not allowed", "<h1>Method not allowed</h1><p>Candidate message submission requires a protected POST request.</p>", 405, headers);
  }

  if (path === "/applications") {
    const context = await rpc("get_admin_application_management_context", { p_admin_id: adminId, p_application_id: null, p_job_id: null });
    if (context?.ok !== true) return authPage("Access denied", "<h1>Access denied</h1>", 403);
    return listPage(basePath, authState, context, url.searchParams.get("q") || "", url.searchParams.get("status") || "all");
  }

  const detailMatch = /^\/applications\/([0-9a-f-]{36})$/i.exec(path);
  if (detailMatch && UUID.test(detailMatch[1])) {
    const { context, communication } = await applicationDetailContext(adminId, detailMatch[1]);
    if (context?.ok !== true || communication?.ok !== true) return authPage("Access denied", "<h1>Access denied</h1>", 403);
    return detailPage(basePath, authState, context.selected, communication, url);
  }

  const documentMatch = /^\/applications\/([0-9a-f-]{36})\/documents\/([0-9a-f-]{36})$/i.exec(path);
  if (documentMatch && UUID.test(documentMatch[1]) && UUID.test(documentMatch[2])) {
    return documentDownload(adminId, documentMatch[1], documentMatch[2], clientHash, userAgent);
  }

  return authPage("Not found", "<h1>Not found</h1><p>The requested application route does not exist.</p>", 404);
}
