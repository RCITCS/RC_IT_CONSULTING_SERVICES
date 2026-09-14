import { authPage, esc, loginPage, prettyTime, shell, type AdminSessionView } from "./ui.ts";

const SUPABASE_URL = String(Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
const LEGACY_SERVICE_ROLE_KEY = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const PAGE_LIMIT = 25;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTACT_STATUSES = new Set(["all", "new", "open", "in_progress", "resolved", "closed", "spam"]);
const READ_FILTERS = new Set(["all", "unread", "read"]);
const ARCHIVE_FILTERS = new Set(["active", "archived", "all"]);

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

async function contactList(adminId: string, filters: InboxFilters): Promise<ContactListContext> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_admin_contact_list`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify({
      p_admin_id: adminId,
      p_limit: PAGE_LIMIT,
      p_query: filters.q || null,
      p_status: filters.status,
      p_archive: filters.archive,
      p_read: filters.read,
      p_cursor_last_activity_at: filters.cursorAt,
      p_cursor_id: filters.cursorId
    })
  });
  if (!response.ok) throw new Error("contact list request failed");
  const body = await response.json();
  const result = Array.isArray(body) ? body[0] ?? null : body;
  if (!result || result.ok !== true) throw new Error("contact list denied");
  return result;
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

function icon(name: "overview" | "jobs" | "applications" | "contacts" | "security" | "signout"): string {
  if (name === "overview") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h7v6H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 13h7v6H4z"/></svg>`;
  if (name === "jobs") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v12H4zM9 7V5h6v2M4 11h16M10 11v2h4v-2"/></svg>`;
  if (name === "applications") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h8l4 4v14H7zM15 3v5h5M10 12h6M10 16h6"/></svg>`;
  if (name === "contacts") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v13H8l-4 3zM7 9h10M7 13h7"/></svg>`;
  if (name === "security") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 19 6v5c0 4.6-2.7 7.8-7 9.5C7.7 18.8 5 15.6 5 11V6l7-2.5Z"/><path d="m9.2 12 1.8 1.8 3.8-4"/></svg>`;
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M14.5 8.5 18 12l-3.5 3.5M9 12h9"/></svg>`;
}

function header(basePath: string, session: AdminSessionView): string {
  return `<header class="global-header"><div class="global-header-inner"><div class="product-brand"><div class="brandmark" aria-hidden="true">RC</div><div class="brand-copy"><strong>RC IT Services</strong><span>Enterprise Administration</span></div></div><nav class="primary-nav" aria-label="Administration"><a href="${basePath || "/"}">${icon("overview")}<span>Overview</span></a><a href="${basePath}/jobs">${icon("jobs")}<span>Jobs</span></a><a href="${basePath}/applications">${icon("applications")}<span>Applications</span></a><a href="${basePath}/contacts" aria-current="page">${icon("contacts")}<span>Contacts</span></a><a href="${basePath}/change-password">${icon("security")}<span>Security</span></a></nav><div class="header-actions"><span class="header-account">${esc(session.admin.email)}</span><form class="header-signout" method="post" action="${basePath}/logout"><input type="hidden" name="csrf" value="${esc(session.csrf)}"><button type="submit" aria-label="Sign out" title="Sign out">${icon("signout")}</button></form><details class="mobile-nav"><summary>Menu</summary><div class="mobile-menu"><a href="${basePath || "/"}">Overview</a><a href="${basePath}/jobs">Jobs</a><a href="${basePath}/applications">Applications</a><a href="${basePath}/contacts" aria-current="page">Contacts</a><a href="${basePath}/change-password">Security</a><form method="post" action="${basePath}/logout"><input type="hidden" name="csrf" value="${esc(session.csrf)}"><button type="submit">Sign out</button></form></div></details></div></div></header>`;
}

function option(value: string, label: string, selected: string): string {
  return `<option value="${esc(value)}"${selected === value ? " selected" : ""}>${esc(label)}</option>`;
}

function statusBadge(status = "new"): string {
  const normalized = status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `<span style="display:inline-flex;align-items:center;min-height:24px;padding:3px 8px;border:1px solid var(--line-strong);border-radius:999px;background:var(--surface-subtle);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">${esc(normalized)}</span>`;
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

function inboxPage(basePath: string, session: AdminSessionView, context: ContactListContext, filters: InboxFilters): Response {
  const items = Array.isArray(context.items) ? context.items : [];
  const rows = items.length ? items.map((item) => `<tr${item.read_at ? "" : ' style="background:#fbfcff"'}><td><div style="display:flex;align-items:center;gap:10px"><div>${readBadge(item)}</div><div><strong>${esc(item.name || "Unknown contact")}</strong><div class="activity-type">${esc(item.email || "")}</div></div></div></td><td><strong>${esc(item.company || "—")}</strong><div class="activity-type">${esc(item.service || item.source || "General enquiry")}</div></td><td><span style="display:block;max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(item.subject || "General enquiry")}</span></td><td>${statusBadge(String(item.status || "new"))}</td><td style="text-align:right"><time datetime="${esc(item.last_activity_at || item.created_at || "")}">${esc(prettyTime(String(item.last_activity_at || item.created_at || "")))}</time></td></tr>`).join("") : `<tr><td colspan="5"><div class="empty"><strong style="display:block;color:var(--text);margin-bottom:5px">No enquiries match this view.</strong>Adjust the search or filters to return to the active contact register.</div></td></tr>`;

  const nextLink = context.has_more && context.next_cursor?.last_activity_at && context.next_cursor?.id
    ? `<a class="btn secondary" rel="next" href="${basePath}/contacts${queryString(filters, true, context.next_cursor)}">Next page</a>`
    : "";
  const resetLink = filters.q || filters.status !== "all" || filters.read !== "all" || filters.archive !== "active"
    ? `<a class="btn secondary" href="${basePath}/contacts">Reset</a>`
    : "";

  return shell("Contact enquiries", `<div class="admin-shell">${header(basePath, session)}<div class="workspace-bar"><div class="workspace-bar-inner"><div class="workspace-context"><strong>Administration</strong><span class="workspace-divider"></span><span>Contact enquiries</span></div><div class="workspace-state"><strong>Protected workspace</strong> · Private customer data</div></div></div><main class="workspace" id="main-content" aria-labelledby="contacts-title"><div class="page-heading"><div><div class="eyebrow">Customer enquiries</div><h1 id="contacts-title">Contact inbox</h1><p>Server-authoritative register of enquiries accepted through RC IT Services public contact channels. This phase is read-only; workflow actions and replies remain disabled until their dedicated phases.</p></div><div class="snapshot"><strong>${items.length} on this page</strong>Maximum ${PAGE_LIMIT} per request<br>Keyset pagination</div></div><section class="data-plane" aria-labelledby="contact-register-title"><header class="section-header"><div><h2 id="contact-register-title">Enquiry register</h2><p>Search and filter the private operational view without exposing message bodies in the list.</p></div><span class="section-meta">Read-only Phase 14.4</span></header><div style="padding:14px 18px;border-bottom:1px solid var(--line)"><form method="get" action="${basePath}/contacts" style="display:grid;grid-template-columns:minmax(220px,1.3fr) repeat(3,minmax(130px,.45fr)) auto;gap:8px;align-items:end"><div><label for="contact-search" style="display:block;font-size:10px;font-weight:700;margin-bottom:5px">Search</label><input id="contact-search" name="q" value="${esc(filters.q)}" maxlength="200" placeholder="Name, email, company, service or subject" style="width:100%;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px"></div><div><label for="contact-status" style="display:block;font-size:10px;font-weight:700;margin-bottom:5px">Status</label><select id="contact-status" name="status" style="width:100%;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px;background:#fff">${option("all","All statuses",filters.status)}${option("new","New",filters.status)}${option("open","Open",filters.status)}${option("in_progress","In progress",filters.status)}${option("resolved","Resolved",filters.status)}${option("closed","Closed",filters.status)}${option("spam","Spam",filters.status)}</select></div><div><label for="contact-read" style="display:block;font-size:10px;font-weight:700;margin-bottom:5px">Read state</label><select id="contact-read" name="read" style="width:100%;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px;background:#fff">${option("all","All",filters.read)}${option("unread","Unread",filters.read)}${option("read","Read",filters.read)}</select></div><div><label for="contact-archive" style="display:block;font-size:10px;font-weight:700;margin-bottom:5px">Archive</label><select id="contact-archive" name="archive" style="width:100%;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px;background:#fff">${option("active","Active",filters.archive)}${option("archived","Archived",filters.archive)}${option("all","All",filters.archive)}</select></div><div class="actions" style="margin:0;gap:6px"><button class="btn secondary" type="submit">Apply</button>${resetLink}</div></form></div><div class="activity-wrap"><table class="activity-table" style="min-width:1000px;table-layout:auto"><thead><tr><th scope="col">Contact</th><th scope="col">Organisation / service</th><th scope="col">Subject</th><th scope="col">Status</th><th scope="col" style="text-align:right">Last activity</th></tr></thead><tbody>${rows}</tbody></table></div><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;padding:14px 18px;border-top:1px solid var(--line)"><span class="muted">Newest activity first · customer message and phone remain detail-only fields</span><div class="actions" style="margin:0">${nextLink}</div></div></section><div class="footerline"><span>RC IT Services · Private contact operations</span><span>No-cache · No-index · Server-authoritative</span></div></main><style>@media(max-width:900px){form[action$="/contacts"]{grid-template-columns:1fr 1fr!important}}@media(max-width:600px){form[action$="/contacts"]{grid-template-columns:1fr!important}.activity-table{min-width:860px}}</style></div>`);
}

export async function handleContactRoute({ request, url, path, basePath, authState }: { request: Request; url: URL; path: string; basePath: string; authState: any | null; }): Promise<Response | null> {
  if (path !== "/contacts") return null;
  if (!authState) return loginPage(basePath, "Please sign in to continue.", true);
  if (authState.admin.role !== "super_admin") return authPage("Access denied", "<h1>Access denied</h1><p>Contact administration requires active super administrator authority.</p>", 403);
  if (request.method !== "GET") {
    const headers = new Headers({ allow: "GET" });
    return authPage("Method not allowed", "<h1>Method not allowed</h1><p>The contact inbox is read-only in this phase.</p>", 405, headers);
  }

  const filters = normalizeFilters(url);
  const context = await contactList(String(authState.admin.id), filters);
  return inboxPage(basePath, authState, context, filters);
}
