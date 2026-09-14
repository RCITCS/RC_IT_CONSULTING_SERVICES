import { shaHex } from "./crypto.js";
import { adminHeader, authPage, esc, loginPage, prettyTime, shell, type AdminSessionView } from "./ui.ts";

const SUPABASE_URL = String(Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
const LEGACY_SERVICE_ROLE_KEY = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const PAGE_LIMIT = 25;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTACT_STATUSES = new Set(["all", "new", "open", "in_progress", "resolved", "closed", "spam"]);
const READ_FILTERS = new Set(["all", "unread", "read"]);
const ARCHIVE_FILTERS = new Set(["active", "archived", "all"]);
const MUTATION_ACTIONS = new Set(["read-state", "workflow", "archive-state"]);

let MODERN_SECRET_KEY = "";
try {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    const keys = JSON.parse(raw) as Record<string, unknown>;
    MODERN_SECRET_KEY = String(keys.default ?? Object.values(keys)[0] ?? "");
  }
} catch {
  // Fail closed below if no valid server credential is available.
}
const API_KEY = MODERN_SECRET_KEY || LEGACY_SERVICE_ROLE_KEY;
const USING_LEGACY_KEY = !MODERN_SECRET_KEY && Boolean(LEGACY_SERVICE_ROLE_KEY);

type ContactListItem = {
  id?: string;
  name?: string;
  email?: string;
  company?: string | null;
  service?: string | null;
  subject?: string | null;
  status?: string;
  source?: string | null;
  read_at?: string | null;
  first_read_at?: string | null;
  archived_at?: string | null;
  created_at?: string;
  last_activity_at?: string;
  version?: number;
};

type ContactListContext = {
  ok?: boolean;
  code?: string;
  items?: ContactListItem[];
  has_more?: boolean;
  next_cursor?: { last_activity_at?: string; id?: string } | null;
};

type ContactEnquiry = ContactListItem & {
  phone?: string | null;
  message?: string | null;
  consent?: boolean;
  consent_at?: string | null;
  metadata?: Record<string, unknown> | null;
  assigned_to?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  updated_at?: string | null;
};

type ContactDetailContext = {
  ok?: boolean;
  code?: string;
  message?: string;
  enquiry?: ContactEnquiry | null;
  history?: unknown[];
  notes?: unknown[];
  messages?: unknown[];
  history_count?: number;
  note_count?: number;
  message_count?: number;
};

type InboxFilters = {
  q: string;
  status: string;
  read: string;
  archive: string;
  cursorAt: string | null;
  cursorId: string | null;
};

function apiHeaders(): Headers {
  if (!SUPABASE_URL || !API_KEY) throw new Error("configuration unavailable");
  const headers = new Headers({ apikey: API_KEY, "content-type": "application/json", accept: "application/json" });
  if (USING_LEGACY_KEY) headers.set("authorization", `Bearer ${LEGACY_SERVICE_ROLE_KEY}`);
  return headers;
}

async function rpc(name: string, payload: Record<string, unknown>): Promise<any> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("contact administration request failed");
  const body = await response.json();
  return Array.isArray(body) ? body[0] ?? null : body;
}

async function contactList(adminId: string, filters: InboxFilters): Promise<ContactListContext> {
  const result = await rpc("get_admin_contact_list", {
    p_admin_id: adminId,
    p_limit: PAGE_LIMIT,
    p_status: filters.status === "all" ? null : filters.status,
    p_read_state: filters.read,
    p_archive_state: filters.archive,
    p_query: filters.q || null,
    p_before_activity: filters.cursorAt,
    p_before_id: filters.cursorId
  });
  if (!result || result.ok !== true) throw new Error("contact list denied");
  return result;
}

async function contactDetail(adminId: string, enquiryId: string): Promise<ContactDetailContext> {
  const result = await rpc("get_admin_contact_detail", { p_admin_id: adminId, p_enquiry_id: enquiryId });
  return result || { ok: false, code: "UNAVAILABLE" };
}

async function csrfOk(state: any, submitted: string): Promise<boolean> {
  return Boolean(submitted) && submitted === state.csrf && await shaHex(submitted) === state.csrf_token_hash;
}

async function requestIpHash(request: Request): Promise<string> {
  const ip = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  return shaHex(ip);
}

function expectedVersion(form: FormData): number | null {
  const raw = String(form.get("expected_version") ?? "");
  if (!/^\d+$/.test(raw)) return null;
  const version = Number(raw);
  return Number.isSafeInteger(version) && version > 0 ? version : null;
}

function redirect(location: string): Response {
  return new Response(null, { status: 303, headers: new Headers({
    location,
    "cache-control": "no-store, max-age=0, must-revalidate",
    "x-robots-tag": "noindex, nofollow, noarchive"
  }) });
}

function normalizeFilters(url: URL): InboxFilters {
  const q = String(url.searchParams.get("q") ?? "").trim().slice(0, 200);
  const rawStatus = String(url.searchParams.get("status") ?? "all").trim().toLowerCase();
  const rawRead = String(url.searchParams.get("read") ?? "all").trim().toLowerCase();
  const rawArchive = String(url.searchParams.get("archive") ?? "active").trim().toLowerCase();
  const rawCursorAt = String(url.searchParams.get("cursor_at") ?? "").trim();
  const rawCursorId = String(url.searchParams.get("cursor_id") ?? "").trim().toLowerCase();

  const status = CONTACT_STATUSES.has(rawStatus) ? rawStatus : "all";
  const read = READ_FILTERS.has(rawRead) ? rawRead : "all";
  const archive = ARCHIVE_FILTERS.has(rawArchive) ? rawArchive : "active";

  let cursorAt: string | null = null;
  let cursorId: string | null = null;
  if (rawCursorAt && rawCursorId && UUID.test(rawCursorId)) {
    const parsed = new Date(rawCursorAt);
    if (!Number.isNaN(parsed.getTime())) {
      cursorAt = parsed.toISOString();
      cursorId = rawCursorId;
    }
  }
  return { q, status, read, archive, cursorAt, cursorId };
}

function option(value: string, label: string, selected: string): string {
  return `<option value="${esc(value)}"${selected === value ? " selected" : ""}>${esc(label)}</option>`;
}

function statusLabel(status: string): string {
  return status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusBadge(status = "new"): string {
  return `<span style="display:inline-flex;align-items:center;min-height:24px;padding:3px 8px;border:1px solid var(--line-strong);border-radius:999px;background:var(--surface-subtle);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">${esc(statusLabel(status))}</span>`;
}

function readBadge(item: ContactListItem): string {
  return item.read_at
    ? `<span style="font-size:10px;color:var(--muted);font-weight:650">Read</span>`
    : `<span style="display:inline-flex;align-items:center;gap:6px;font-size:10px;color:var(--accent-strong);font-weight:750"><span aria-hidden="true" style="width:7px;height:7px;border-radius:50%;background:currentColor"></span>Unread</span>`;
}

function queryString(filters: InboxFilters, includeCursor: boolean, cursor?: { last_activity_at?: string; id?: string } | null): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.read !== "all") params.set("read", filters.read);
  if (filters.archive !== "active") params.set("archive", filters.archive);
  if (includeCursor && cursor?.last_activity_at && cursor?.id) {
    params.set("cursor_at", cursor.last_activity_at);
    params.set("cursor_id", cursor.id);
  }
  const value = params.toString();
  return value ? `?${value}` : "";
}

function workspaceBar(label: string, state = "Private customer data"): string {
  return `<div class="workspace-bar"><div class="workspace-bar-inner"><div class="workspace-context"><strong>Administration</strong><span class="workspace-divider"></span><span>${esc(label)}</span></div><div class="workspace-state"><strong>Protected workspace</strong> · ${esc(state)}</div></div></div>`;
}

function fact(label: string, value: unknown, subtle = false): string {
  const display = value == null || String(value).trim() === "" ? "—" : String(value);
  return `<div style="padding:12px 14px;border:1px solid var(--line);background:${subtle ? "var(--surface-subtle)" : "#fff"}"><span style="display:block;color:var(--muted);font-size:9px;font-weight:750;text-transform:uppercase;letter-spacing:.06em">${esc(label)}</span><strong style="display:block;margin-top:5px;font-size:12px;line-height:1.5;overflow-wrap:anywhere">${esc(display)}</strong></div>`;
}

function dateFact(label: string, iso?: string | null): string {
  return fact(label, iso ? prettyTime(iso) : "—", true);
}

function detailOperationalMetadata(enquiry: ContactEnquiry): string {
  const metadata = enquiry.metadata && typeof enquiry.metadata === "object" ? enquiry.metadata : {};
  const items = [["Intent", metadata.intent], ["Job title", metadata.job_title], ["Submission type", metadata.submission_type]]
    .filter(([, value]) => value != null && String(value).trim() !== "");
  if (!items.length) return "";
  return `<section class="data-plane" aria-labelledby="contact-intake-context-title"><header class="section-header"><div><h2 id="contact-intake-context-title">Intake context</h2><p>Selected immutable submission context captured with the original enquiry.</p></div><span class="section-meta">Accepted evidence</span></header><div style="padding:18px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:10px">${items.map(([label, value]) => fact(String(label), value, true)).join("")}</div></section>`;
}

function inboxPage(basePath: string, session: AdminSessionView, context: ContactListContext, filters: InboxFilters): Response {
  const items = Array.isArray(context.items) ? context.items : [];
  const rows = items.length ? items.map((item) => {
    const id = String(item.id || "");
    const detailHref = UUID.test(id) ? `${basePath}/contacts/${esc(id)}` : "";
    return `<tr${item.read_at ? "" : ' style="background:#fbfcff"'}><td><div style="display:flex;align-items:center;gap:10px"><div>${readBadge(item)}</div><div>${detailHref ? `<a href="${detailHref}" style="font-weight:760;color:var(--text);text-decoration:none">${esc(item.name || "Unknown contact")}</a>` : `<strong>${esc(item.name || "Unknown contact")}</strong>`}<div class="activity-type">${esc(item.email || "")}</div></div></div></td><td><strong>${esc(item.company || "—")}</strong><div class="activity-type">${esc(item.service || item.source || "General enquiry")}</div></td><td><span style="display:block;max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(item.subject || "General enquiry")}</span></td><td>${statusBadge(String(item.status || "new"))}</td><td style="text-align:right"><time datetime="${esc(item.last_activity_at || item.created_at || "")}">${esc(prettyTime(String(item.last_activity_at || item.created_at || "")))}</time></td><td style="text-align:right">${detailHref ? `<a class="btn secondary" href="${detailHref}" style="min-height:32px;padding:6px 9px;font-size:10px">View</a>` : ""}</td></tr>`;
  }).join("") : `<tr><td colspan="6"><div class="empty"><strong style="display:block;color:var(--text);margin-bottom:5px">No enquiries match this view.</strong>Adjust the search or filters to return to the active contact register.</div></td></tr>`;

  const nextLink = context.has_more && context.next_cursor?.last_activity_at && context.next_cursor?.id
    ? `<a class="btn secondary" rel="next" href="${basePath}/contacts${queryString(filters, true, context.next_cursor)}">Next page</a>` : "";
  const resetLink = filters.q || filters.status !== "all" || filters.read !== "all" || filters.archive !== "active"
    ? `<a class="btn secondary" href="${basePath}/contacts">Reset</a>` : "";

  return shell("Contact enquiries", `<div class="admin-shell">${adminHeader(basePath, session, "contacts")}${workspaceBar("Contact enquiries")}<main class="workspace" id="main-content" aria-labelledby="contacts-title"><div class="page-heading"><div><div class="eyebrow">Customer enquiries</div><h1 id="contacts-title">Contact inbox</h1><p>Server-authoritative register of enquiries accepted through RC IT Services public contact channels. Open a record to inspect the immutable intake and operational context.</p></div><div class="snapshot"><strong>${items.length} on this page</strong>Maximum ${PAGE_LIMIT} per request<br>Keyset pagination</div></div><section class="data-plane" aria-labelledby="contact-register-title"><header class="section-header"><div><h2 id="contact-register-title">Enquiry register</h2><p>Search and filter the private operational view without exposing message bodies or phone numbers in the list.</p></div><span class="section-meta">Operational register</span></header><div style="padding:14px 18px;border-bottom:1px solid var(--line)"><form method="get" action="${basePath}/contacts" style="display:grid;grid-template-columns:minmax(220px,1.3fr) repeat(3,minmax(130px,.45fr)) auto;gap:8px;align-items:end"><div><label for="contact-search" style="display:block;font-size:10px;font-weight:700;margin-bottom:5px">Search</label><input id="contact-search" name="q" value="${esc(filters.q)}" maxlength="200" placeholder="Name, email, company, service or subject" style="width:100%;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px"></div><div><label for="contact-status" style="display:block;font-size:10px;font-weight:700;margin-bottom:5px">Status</label><select id="contact-status" name="status" style="width:100%;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px;background:#fff">${option("all","All statuses",filters.status)}${option("new","New",filters.status)}${option("open","Open",filters.status)}${option("in_progress","In progress",filters.status)}${option("resolved","Resolved",filters.status)}${option("closed","Closed",filters.status)}${option("spam","Spam",filters.status)}</select></div><div><label for="contact-read" style="display:block;font-size:10px;font-weight:700;margin-bottom:5px">Read state</label><select id="contact-read" name="read" style="width:100%;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px;background:#fff">${option("all","All",filters.read)}${option("unread","Unread",filters.read)}${option("read","Read",filters.read)}</select></div><div><label for="contact-archive" style="display:block;font-size:10px;font-weight:700;margin-bottom:5px">Archive</label><select id="contact-archive" name="archive" style="width:100%;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px;background:#fff">${option("active","Active",filters.archive)}${option("archived","Archived",filters.archive)}${option("all","All",filters.archive)}</select></div><div class="actions" style="margin:0;gap:6px"><button class="btn secondary" type="submit">Apply</button>${resetLink}</div></form></div><div class="activity-wrap"><table class="activity-table" style="min-width:1080px;table-layout:auto"><thead><tr><th scope="col">Contact</th><th scope="col">Organisation / service</th><th scope="col">Subject</th><th scope="col">Status</th><th scope="col" style="text-align:right">Last activity</th><th scope="col" style="text-align:right">Record</th></tr></thead><tbody>${rows}</tbody></table></div><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;padding:14px 18px;border-top:1px solid var(--line)"><span class="muted">Newest activity first · customer message and phone remain detail-only fields</span><div class="actions" style="margin:0">${nextLink}</div></div></section><div class="footerline"><span>RC IT Services · Private contact operations</span><span>No-cache · No-index · Server-authoritative</span></div></main><style>@media(max-width:900px){form[action$="/contacts"]{grid-template-columns:1fr 1fr!important}}@media(max-width:600px){form[action$="/contacts"]{grid-template-columns:1fr!important}.activity-table{min-width:900px}}</style></div>`);
}

function workflowTargets(status: string): string[] {
  const targets: Record<string, string[]> = {
    new: ["open", "in_progress", "resolved", "spam"],
    open: ["in_progress", "resolved", "closed", "spam"],
    in_progress: ["open", "resolved", "closed", "spam"],
    resolved: ["open", "closed"],
    closed: ["open"],
    spam: ["open"]
  };
  return targets[status] || [];
}

function operationNotice(url: URL): { message: string; error: boolean } {
  const notice = String(url.searchParams.get("notice") || "");
  const error = String(url.searchParams.get("error") || "");
  const notices: Record<string, string> = {
    read: "Enquiry marked as read.", unread: "Enquiry marked as unread.", workflow: "Workflow status updated.",
    archived: "Enquiry archived.", restored: "Enquiry restored."
  };
  const errors: Record<string, string> = {
    stale: "This enquiry changed after the page was loaded. Review the latest version before trying again.",
    archived: "Restore the enquiry before changing its read state or workflow status.",
    invalid_transition: "That workflow transition is not permitted from the current status.",
    invalid_archive: "Resolve, close, or mark the enquiry as spam before archiving it.",
    validation: "The requested contact operation was invalid.",
    not_found: "The requested contact enquiry no longer exists.",
    failed: "The requested contact operation could not be completed."
  };
  if (notices[notice]) return { message: notices[notice], error: false };
  if (errors[error]) return { message: errors[error], error: true };
  return { message: "", error: false };
}

function contactOperations(basePath: string, session: AdminSessionView, enquiry: ContactEnquiry): string {
  const id = String(enquiry.id || "");
  const version = Number(enquiry.version || 0);
  if (!UUID.test(id) || !Number.isSafeInteger(version) || version < 1) return "";
  const csrf = esc(session.csrf);
  const hidden = `<input type="hidden" name="csrf" value="${csrf}"><input type="hidden" name="expected_version" value="${esc(version)}">`;
  if (enquiry.archived_at) {
    return `<section class="data-plane" aria-labelledby="contact-actions-title" style="margin-top:14px"><header class="section-header"><div><h2 id="contact-actions-title">Record controls</h2><p>This terminal enquiry is archived. Restore it before changing read state or workflow status.</p></div><span class="section-meta">Archived</span></header><div style="padding:18px"><form method="post" action="${basePath}/contacts/${esc(id)}/archive-state">${hidden}<input type="hidden" name="archive" value="0"><button class="btn secondary" type="submit">Restore enquiry</button></form></div></section>`;
  }

  const status = String(enquiry.status || "new");
  const targets = workflowTargets(status);
  const canArchive = ["resolved", "closed", "spam"].includes(status);
  const workflow = targets.length ? `<form method="post" action="${basePath}/contacts/${esc(id)}/workflow" style="display:flex;gap:8px;align-items:end;flex-wrap:wrap">${hidden}<div><label for="contact-target-status" style="display:block;font-size:10px;font-weight:700;margin-bottom:5px">Change workflow status</label><select id="contact-target-status" name="target_status" required style="min-width:190px;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px;background:#fff"><option value="">Select next status</option>${targets.map((target) => `<option value="${esc(target)}">${esc(statusLabel(target))}</option>`).join("")}</select></div><button class="btn" type="submit">Update status</button></form>` : "";
  const archive = canArchive ? `<form method="post" action="${basePath}/contacts/${esc(id)}/archive-state">${hidden}<input type="hidden" name="archive" value="1"><button class="btn secondary" type="submit">Archive enquiry</button></form>` : `<span class="muted">Archiving becomes available after Resolve, Close, or Spam.</span>`;
  return `<section class="data-plane" aria-labelledby="contact-actions-title" style="margin-top:14px"><header class="section-header"><div><h2 id="contact-actions-title">Workflow controls</h2><p>Every mutation is version-checked, validated by PostgreSQL, and recorded in history and the administrative audit stream.</p></div><span class="section-meta">Server-authoritative</span></header><div style="padding:18px;display:flex;gap:16px;align-items:end;justify-content:space-between;flex-wrap:wrap"><div style="display:flex;gap:12px;align-items:end;flex-wrap:wrap"><form method="post" action="${basePath}/contacts/${esc(id)}/read-state">${hidden}<input type="hidden" name="read" value="${enquiry.read_at ? "0" : "1"}"><button class="btn secondary" type="submit">${enquiry.read_at ? "Mark unread" : "Mark read"}</button></form>${workflow}</div><div>${archive}</div></div></section>`;
}

function contactDetailPage(basePath: string, session: AdminSessionView, context: ContactDetailContext, url: URL): Response {
  const enquiry = context.enquiry || {};
  const message = String(enquiry.message || "");
  const source = String(enquiry.source || "contact");
  const readState = enquiry.read_at ? "Read" : "Unread";
  const archiveState = enquiry.archived_at ? "Archived" : "Active";
  const consentState = enquiry.consent ? "Recorded" : "Not recorded";
  const version = Number(enquiry.version || 1);
  const counts = { history: Number(context.history_count || 0), notes: Number(context.note_count || 0), messages: Number(context.message_count || 0) };
  const notice = operationNotice(url);
  const noticeHtml = notice.message ? `<div class="msg ${notice.error ? "error" : "ok"}" role="status">${esc(notice.message)}</div>` : "";

  return shell("Contact enquiry", `<div class="admin-shell">${adminHeader(basePath, session, "contacts")}${workspaceBar("Enquiry detail", "Immutable intake · operational context")}<main class="workspace" id="main-content" aria-labelledby="contact-detail-title"><div class="page-heading"><div><div class="eyebrow">Contact record</div><h1 id="contact-detail-title">${esc(enquiry.name || "Contact enquiry")}</h1><p>${esc(enquiry.subject || "General enquiry")}</p></div><div class="snapshot"><strong>${statusBadge(String(enquiry.status || "new"))}</strong>${esc(readState)} · ${esc(archiveState)}<br>Version ${esc(version)}</div></div>${noticeHtml}<div class="actions" style="margin:0 0 14px"><a class="btn secondary" href="${basePath}/contacts">Back to contact inbox</a></div><section class="data-plane" aria-labelledby="original-enquiry-title"><header class="section-header"><div><h2 id="original-enquiry-title">Original enquiry</h2><p>Accepted customer-submitted evidence is immutable after intake.</p></div><span class="section-meta">Read-only evidence</span></header><div style="padding:18px"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:10px;margin-bottom:16px">${fact("Name", enquiry.name)}${fact("Email", enquiry.email)}${fact("Phone", enquiry.phone || "—")}${fact("Company", enquiry.company || "—")}${fact("Service / topic", enquiry.service || "—")}${fact("Source", source)}${fact("Privacy consent", consentState)}${dateFact("Consent recorded", enquiry.consent_at)}</div><div style="padding:16px;border:1px solid var(--line);background:var(--surface-subtle)"><span style="display:block;color:var(--muted);font-size:9px;font-weight:750;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Customer message</span><div style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.7;color:var(--text)">${esc(message || "No message content was stored.")}</div></div></div></section>${detailOperationalMetadata(enquiry)}<section class="data-plane" aria-labelledby="contact-operations-title" style="margin-top:14px"><header class="section-header"><div><h2 id="contact-operations-title">Operational context</h2><p>Current server-authoritative state. Opening this page does not change read state or workflow status.</p></div><span class="section-meta">Explicit actions only</span></header><div style="padding:18px"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:10px">${fact("Workflow status", statusLabel(String(enquiry.status || "new")), true)}${fact("Read state", readState, true)}${fact("Archive state", archiveState, true)}${fact("History events", counts.history, true)}${fact("Internal notes", counts.notes, true)}${fact("Outbound replies", counts.messages, true)}${dateFact("Received", enquiry.created_at)}${dateFact("First reviewed", enquiry.first_read_at)}${dateFact("Currently read since", enquiry.read_at)}${dateFact("Resolved", enquiry.resolved_at)}${dateFact("Closed", enquiry.closed_at)}${dateFact("Archived", enquiry.archived_at)}${dateFact("Last activity", enquiry.last_activity_at)}${dateFact("Record updated", enquiry.updated_at)}</div></div></section>${contactOperations(basePath, session, enquiry)}<div class="readonly-note"><span>Read/workflow/archive changes require an explicit administrator action. Internal notes, replies, and timeline rendering remain outside this subphase.</span></div><div class="footerline"><span>RC IT Services · Private contact record</span><span>Escaped customer content · Immutable intake · Version ${esc(version)}</span></div></main><style>@media(max-width:600px){#main-content .page-heading{align-items:flex-start}}</style></div>`);
}

function contactDetailError(basePath: string, session: AdminSessionView, title: string, message: string, status: number): Response {
  return shell(title, `<div class="admin-shell">${adminHeader(basePath, session, "contacts")}${workspaceBar("Enquiry detail")}<main class="workspace" id="main-content"><div class="page-heading"><div><div class="eyebrow">Contact record</div><h1>${esc(title)}</h1><p>${esc(message)}</p></div></div><div class="actions"><a class="btn secondary" href="${basePath}/contacts">Back to contact inbox</a></div></main></div>`, status);
}

function mutationErrorCode(code: unknown): string {
  const map: Record<string, string> = {
    STALE_VERSION: "stale", ARCHIVED: "archived", INVALID_TRANSITION: "invalid_transition",
    INVALID_ARCHIVE_STATE: "invalid_archive", VALIDATION: "validation", NOT_FOUND: "not_found"
  };
  return map[String(code || "")] || "failed";
}

export async function handleContactRoute({ request, url, path, basePath, authState }: { request: Request; url: URL; path: string; basePath: string; authState: any | null; }): Promise<Response | null> {
  const detailMatch = path.match(/^\/contacts\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i);
  const mutationMatch = path.match(/^\/contacts\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/(read-state|workflow|archive-state)$/i);
  if (path !== "/contacts" && !detailMatch && !mutationMatch) return null;
  if (!authState) return loginPage(basePath, "Please sign in to continue.", true);
  if (authState.admin.role !== "super_admin") return authPage("Access denied", "<h1>Access denied</h1><p>Contact administration requires active super administrator authority.</p>", 403);
  const adminId = String(authState.admin.id);

  if (request.method === "GET") {
    if (mutationMatch) return authPage("Method not allowed", "<h1>Method not allowed</h1><p>Contact mutations require a protected POST request.</p>", 405, new Headers({ allow: "POST" }));
    if (detailMatch) {
      const enquiryId = detailMatch[1].toLowerCase();
      const context = await contactDetail(adminId, enquiryId);
      if (context.ok !== true) {
        if (context.code === "NOT_FOUND") return contactDetailError(basePath, authState, "Enquiry not found", "The requested contact enquiry does not exist.", 404);
        if (context.code === "FORBIDDEN") return contactDetailError(basePath, authState, "Access denied", "Your administrator session cannot access this contact record.", 403);
        return contactDetailError(basePath, authState, "Contact record unavailable", "The enquiry could not be loaded. Please try again.", 503);
      }
      return contactDetailPage(basePath, authState, context, url);
    }
    const filters = normalizeFilters(url);
    return inboxPage(basePath, authState, await contactList(adminId, filters), filters);
  }

  if (request.method !== "POST" || !mutationMatch) {
    return authPage("Method not allowed", "<h1>Method not allowed</h1><p>This contact-administration route does not support the requested method.</p>", 405, new Headers({ allow: path === "/contacts" || detailMatch ? "GET" : "POST" }));
  }

  const enquiryId = mutationMatch[1].toLowerCase();
  const action = mutationMatch[2].toLowerCase();
  if (!MUTATION_ACTIONS.has(action)) return contactDetailError(basePath, authState, "Invalid operation", "The requested contact operation is not supported.", 400);
  const form = await request.formData();
  if (!(await csrfOk(authState, String(form.get("csrf") ?? "")))) return contactDetailError(basePath, authState, "Request rejected", "Reload the contact record and try again.", 403);
  const version = expectedVersion(form);
  if (!version) return redirect(`${basePath}/contacts/${enquiryId}?error=stale`);
  const auditBase = {
    p_admin_id: adminId,
    p_enquiry_id: enquiryId,
    p_expected_version: version,
    p_ip_hash: await requestIpHash(request),
    p_user_agent: String(request.headers.get("user-agent") || "").slice(0, 500)
  };

  let result: any;
  let notice = "workflow";
  if (action === "read-state") {
    const requested = String(form.get("read") ?? "");
    if (requested !== "0" && requested !== "1") return redirect(`${basePath}/contacts/${enquiryId}?error=validation`);
    const read = requested === "1";
    result = await rpc("admin_set_contact_read_state", { ...auditBase, p_read: read });
    notice = read ? "read" : "unread";
  } else if (action === "workflow") {
    const target = String(form.get("target_status") ?? "").trim().toLowerCase();
    if (!["open", "in_progress", "resolved", "closed", "spam"].includes(target)) return redirect(`${basePath}/contacts/${enquiryId}?error=validation`);
    result = await rpc("admin_transition_contact_enquiry", { ...auditBase, p_target_status: target });
    notice = "workflow";
  } else {
    const requested = String(form.get("archive") ?? "");
    if (requested !== "0" && requested !== "1") return redirect(`${basePath}/contacts/${enquiryId}?error=validation`);
    const archive = requested === "1";
    result = await rpc("admin_set_contact_archive_state", { ...auditBase, p_archive: archive });
    notice = archive ? "archived" : "restored";
  }

  if (!result || result.ok !== true) return redirect(`${basePath}/contacts/${enquiryId}?error=${mutationErrorCode(result?.code)}`);
  return redirect(`${basePath}/contacts/${enquiryId}?notice=${notice}`);
}
