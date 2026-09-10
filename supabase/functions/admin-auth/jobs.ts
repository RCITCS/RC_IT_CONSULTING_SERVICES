import { esc, prettyTime, shell, type AdminSessionView } from "./ui.ts";

export type JobRecord = {
  id?: string;
  category_id?: string | null;
  category_name?: string | null;
  code?: string | null;
  slug?: string;
  title?: string;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  workplace_type?: string | null;
  employment_type?: string | null;
  experience?: string | null;
  technologies?: unknown[];
  required_skills?: unknown[];
  preferred_skills?: unknown[];
  industries?: unknown[];
  responsibilities?: unknown[];
  qualifications?: unknown[];
  preferred_qualifications?: unknown[];
  benefits?: unknown[];
  working_style_details?: unknown[];
  location_details?: string | null;
  application_response_window?: string | null;
  status?: string;
  opens_at?: string | null;
  published_at?: string | null;
  closes_at?: string | null;
  archived_at?: string | null;
  version?: number;
  application_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type JobManagementContext = {
  ok?: boolean;
  code?: string;
  jobs?: JobRecord[];
  categories?: Array<{ id?: string; name?: string; slug?: string; is_active?: boolean; display_order?: number }>;
  selected?: JobRecord | null;
};

const WORK_MODELS = [
  ["onsite", "On-site"],
  ["hybrid", "Hybrid"],
  ["remote", "Remote"],
  ["flexible", "Flexible"]
] as const;

const EMPLOYMENT_TYPES = [
  ["full_time", "Full time"],
  ["part_time", "Part time"],
  ["contract", "Contract"],
  ["temporary", "Temporary"],
  ["internship", "Internship"],
  ["other", "Other"]
] as const;

function icon(name: "overview" | "jobs" | "security" | "signout" | "info"): string {
  if (name === "overview") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h7v6H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 13h7v6H4z"/></svg>`;
  if (name === "jobs") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v12H4zM9 7V5h6v2M4 11h16M10 11v2h4v-2"/></svg>`;
  if (name === "security") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 19 6v5c0 4.6-2.7 7.8-7 9.5C7.7 18.8 5 15.6 5 11V6l7-2.5Z"/><path d="m9.2 12 1.8 1.8 3.8-4"/></svg>`;
  if (name === "signout") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M14.5 8.5 18 12l-3.5 3.5M9 12h9"/></svg>`;
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/></svg>`;
}

function adminHeader(basePath: string, session: AdminSessionView, current: "jobs" | "overview" | "security"): string {
  const currentAttr = (name: string) => name === current ? ' aria-current="page"' : "";
  return `<header class="global-header"><div class="global-header-inner">
    <div class="product-brand"><div class="brandmark" aria-hidden="true">RC</div><div class="brand-copy"><strong>RC IT Services</strong><span>Enterprise Administration</span></div></div>
    <nav class="primary-nav" aria-label="Administration"><a href="${basePath || "/"}"${currentAttr("overview")}>${icon("overview")}<span>Overview</span></a><a href="${basePath}/jobs"${currentAttr("jobs")}>${icon("jobs")}<span>Jobs</span></a><a href="${basePath}/change-password"${currentAttr("security")}>${icon("security")}<span>Security</span></a></nav>
    <div class="header-actions"><span class="header-account">${esc(session.admin.email)}</span><form class="header-signout" method="post" action="${basePath}/logout"><input type="hidden" name="csrf" value="${esc(session.csrf)}"><button type="submit" aria-label="Sign out" title="Sign out">${icon("signout")}</button></form><details class="mobile-nav"><summary>Menu</summary><div class="mobile-menu"><a href="${basePath || "/"}"${currentAttr("overview")}>Overview</a><a href="${basePath}/jobs"${currentAttr("jobs")}>Jobs</a><a href="${basePath}/change-password"${currentAttr("security")}>Security</a><form method="post" action="${basePath}/logout"><input type="hidden" name="csrf" value="${esc(session.csrf)}"><button type="submit">Sign out</button></form></div></details></div>
  </div></header>`;
}

function workspaceBar(label: string): string {
  return `<div class="workspace-bar"><div class="workspace-bar-inner"><div class="workspace-context"><strong>Administration</strong><span class="workspace-divider"></span><span>${esc(label)}</span></div><div class="workspace-state"><strong>Protected workspace</strong> · Server-authoritative CMS</div></div></div>`;
}

function notice(message = "", error = false): string {
  return message ? `<div class="msg ${error ? "error" : "ok"}" role="status">${esc(message)}</div>` : "";
}

function value(job: JobRecord | null | undefined, key: keyof JobRecord): string {
  const raw = job?.[key];
  return raw == null ? "" : String(raw);
}

function listText(current: unknown): string {
  return Array.isArray(current) ? current.map((item) => String(item ?? "").trim()).filter(Boolean).join("\n") : "";
}

function option(current: string, label: string, selected = ""): string {
  return `<option value="${esc(current)}"${current === selected ? " selected" : ""}>${esc(label)}</option>`;
}

function selectField(id: string, label: string, name: string, options: readonly (readonly [string, string])[], selected = "", required = false): string {
  return `<div class="field"><label for="${id}">${esc(label)}${required ? " *" : ""}</label><select id="${id}" name="${esc(name)}" style="width:100%;min-height:44px;border:1px solid var(--line-strong);border-radius:3px;padding:10px 12px;background:#fff;color:var(--text)"${required ? " required" : ""}><option value="">Select</option>${options.map(([v,l]) => option(v,l,selected)).join("")}</select></div>`;
}

function textField(id: string, label: string, name: string, current = "", required = false, type = "text", max = 200, help = ""): string {
  return `<div class="field"><label for="${id}">${esc(label)}${required ? " *" : ""}</label><input id="${id}" name="${esc(name)}" type="${esc(type)}" value="${esc(current)}" maxlength="${max}"${required ? " required" : ""}>${help ? `<p class="muted">${esc(help)}</p>` : ""}</div>`;
}

function textareaField(id: string, label: string, name: string, current = "", help = "", max = 20000): string {
  return `<div class="field"><label for="${id}">${esc(label)}</label><textarea id="${id}" name="${esc(name)}" maxlength="${max}" style="width:100%;min-height:130px;border:1px solid var(--line-strong);border-radius:3px;padding:11px 12px;background:#fff;color:var(--text);resize:vertical">${esc(current)}</textarea>${help ? `<p class="muted">${esc(help)}</p>` : ""}</div>`;
}

function londonInput(iso?: string | null): string {
  if (!iso) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date(iso)).reduce((acc: Record<string,string>, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  } catch {
    return "";
  }
}

function statusBadge(status = "draft"): string {
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `<span style="display:inline-flex;align-items:center;min-height:24px;padding:3px 8px;border:1px solid var(--line-strong);border-radius:999px;background:var(--surface-subtle);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">${esc(label)}</span>`;
}

function statusAction(basePath: string, session: AdminSessionView, job: JobRecord, action: string, label: string, primary = false): string {
  return `<form method="post" action="${basePath}/jobs/${esc(job.id || "")}/transition" style="display:inline"><input type="hidden" name="csrf" value="${esc(session.csrf)}"><input type="hidden" name="expected_version" value="${esc(job.version ?? 1)}"><input type="hidden" name="action" value="${esc(action)}"><button class="btn${primary ? "" : " secondary"}" type="submit" style="min-height:32px;padding:6px 9px;font-size:10px">${esc(label)}</button></form>`;
}

function rowActions(basePath: string, session: AdminSessionView, job: JobRecord): string {
  const actions = [
    `<a class="btn secondary" style="min-height:32px;padding:6px 9px;font-size:10px" href="${basePath}/jobs/${esc(job.id || "")}/edit">Edit</a>`,
    `<a class="btn secondary" style="min-height:32px;padding:6px 9px;font-size:10px" href="${basePath}/jobs/${esc(job.id || "")}/preview">Preview</a>`,
    `<form method="post" action="${basePath}/jobs/${esc(job.id || "")}/duplicate" style="display:inline"><input type="hidden" name="csrf" value="${esc(session.csrf)}"><input type="hidden" name="expected_version" value="${esc(job.version ?? 1)}"><button class="btn secondary" type="submit" style="min-height:32px;padding:6px 9px;font-size:10px">Duplicate</button></form>`
  ];
  if (job.status === "draft") actions.push(statusAction(basePath, session, job, "publish", "Publish", true));
  if (job.status === "published") {
    actions.push(statusAction(basePath, session, job, "unpublish", "Unpublish"));
    actions.push(statusAction(basePath, session, job, "close", "Close"));
  }
  if (job.status === "draft" || job.status === "closed") actions.push(statusAction(basePath, session, job, "archive", "Archive"));
  if (job.status === "archived") actions.push(statusAction(basePath, session, job, "restore", "Restore"));
  if (job.status === "draft" && !job.published_at && Number(job.application_count || 0) === 0) {
    actions.push(`<a class="btn secondary" style="min-height:32px;padding:6px 9px;font-size:10px" href="${basePath}/jobs/${esc(job.id || "")}/delete">Delete draft</a>`);
  }
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${actions.join("")}</div>`;
}

function filterJobs(jobs: JobRecord[], query = "", status = ""): JobRecord[] {
  const q = query.trim().toLowerCase();
  return jobs.filter((job) => {
    if (status && status !== "all" && job.status !== status) return false;
    if (!q) return true;
    return [job.title, job.slug, job.code, job.category_name, job.location].some((item) => String(item ?? "").toLowerCase().includes(q));
  });
}

export function jobsListPage(basePath: string, session: AdminSessionView, context: JobManagementContext, query = "", status = "all", message = "", error = false): Response {
  const jobs = Array.isArray(context.jobs) ? context.jobs : [];
  const visible = filterJobs(jobs, query, status);
  const count = (key: string) => jobs.filter((job) => job.status === key).length;
  const rows = visible.length ? visible.map((job) => `<tr>
    <td><strong class="activity-action">${esc(job.title || "Untitled")}</strong><div class="activity-type">${esc(job.code || "Identifier pending")} · /${esc(job.slug || "")}</div></td>
    <td>${statusBadge(job.status)}</td><td>${esc(job.category_name || "Uncategorised")}</td>
    <td>${esc(job.location || "Not set")}<div class="activity-type">${esc(job.workplace_type || "Work model not set")}</div></td>
    <td style="text-align:right">${esc(job.application_count ?? 0)}</td><td style="text-align:right">${esc(prettyTime(String(job.updated_at || "")))}</td><td>${rowActions(basePath, session, job)}</td>
  </tr>`).join("") : `<tr><td colspan="7"><div class="empty">No jobs match this view. Create a draft or change the filters.</div></td></tr>`;

  return shell("Jobs", `<div class="admin-shell">${adminHeader(basePath, session, "jobs")}${workspaceBar("Job management")}
  <main class="workspace" id="main-content" aria-labelledby="jobs-title"><div class="page-heading"><div><div class="eyebrow">Recruitment content</div><h1 id="jobs-title">Job management</h1><p>Create, review and control vacancy publication without editing application source code. Public visibility remains server-authoritative.</p></div><div class="snapshot"><strong>${jobs.length} total jobs</strong>${count("published")} published · ${count("draft")} draft<br>${count("closed")} closed · ${count("archived")} archived</div></div>${notice(message,error)}
    <section class="data-plane" aria-labelledby="job-list-title"><header class="section-header"><div><h2 id="job-list-title">Vacancy register</h2><p>Publishing, unpublishing, closure and archive transitions are audited and version-checked.</p></div><a class="btn" href="${basePath}/jobs/new">Create job</a></header>
      <div style="padding:14px 18px;border-bottom:1px solid var(--line)"><form method="get" action="${basePath}/jobs" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:8px;align-items:end"><div><label for="job-search" style="display:block;font-size:10px;font-weight:700;margin-bottom:5px">Search</label><input id="job-search" name="q" value="${esc(query)}" placeholder="Title, code, slug, category or location" style="width:100%;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px"></div><div><label for="job-status" style="display:block;font-size:10px;font-weight:700;margin-bottom:5px">Status</label><select id="job-status" name="status" style="width:100%;min-height:38px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px;background:#fff">${[["all","All statuses"],["draft","Draft"],["published","Published"],["closed","Closed"],["archived","Archived"]].map(([v,l])=>option(v,l,status)).join("")}</select></div><button class="btn secondary" type="submit" style="min-height:38px">Apply filters</button></form></div>
      <div class="activity-wrap"><table class="activity-table" style="min-width:1120px"><thead><tr><th scope="col" style="width:22%">Role</th><th scope="col" style="width:9%">Status</th><th scope="col" style="width:11%">Category</th><th scope="col" style="width:14%">Location</th><th scope="col" style="width:7%;text-align:right">Apps</th><th scope="col" style="width:14%;text-align:right">Updated</th><th scope="col" style="width:23%;text-align:right">Actions</th></tr></thead><tbody>${rows}</tbody></table></div>
    </section><div class="footerline"><span>RC IT Services · Private administration</span><span>Optimistic concurrency · Audit trail · Public status authority</span></div></main></div>`);
}

export function jobEditorPage(basePath: string, session: AdminSessionView, context: JobManagementContext, job: JobRecord | null = null, message = "", error = false, submitted?: Record<string, unknown>): Response {
  const editing = Boolean(job?.id);
  const source: JobRecord = submitted ? { ...job, ...submitted } as JobRecord : (job || {});
  const action = editing ? `${basePath}/jobs/${esc(job?.id || "")}/update` : `${basePath}/jobs/create`;
  const categories = Array.isArray(context.categories) ? context.categories.filter((category) => category.name) : [];
  const datalist = categories.length ? `<datalist id="job-categories">${categories.map((category)=>`<option value="${esc(category.name || "")}"></option>`).join("")}</datalist>` : "";
  const categoryValue = value(source,"category_name") || String((submitted as any)?.category || "");

  return shell(editing ? "Edit job" : "Create job", `<div class="admin-shell">${adminHeader(basePath, session, "jobs")}${workspaceBar(editing ? "Edit vacancy" : "Create vacancy")}
  <main class="workspace" id="main-content" aria-labelledby="job-editor-title"><div class="page-heading"><div><div class="eyebrow">${editing ? "Vacancy record" : "New vacancy"}</div><h1 id="job-editor-title">${editing ? esc(job?.title || "Edit job") : "Create job"}</h1><p>Save authoritative recruitment content as a draft. Publication is a separate audited transition.</p></div>${editing ? `<div class="snapshot"><strong>${statusBadge(job?.status)}</strong>${esc(job?.code || "Identifier pending")} · Version ${esc(job?.version ?? 1)}<br>Updated ${esc(prettyTime(String(job?.updated_at || "")))}</div>` : `<div class="snapshot"><strong>Identifier</strong>Generated automatically<br>when the draft is created</div>`}</div>${notice(message,error)}
    <form method="post" action="${action}"><input type="hidden" name="csrf" value="${esc(session.csrf)}">${editing ? `<input type="hidden" name="expected_version" value="${esc(job?.version ?? 1)}">` : ""}
      <section class="data-plane"><header class="section-header"><div><h2>Role identity</h2><p>The job code is generated server-side and remains immutable. The administrator controls the title, canonical slug and category.</p></div><span class="section-meta">Corporate identity</span></header><div style="padding:4px 22px 18px"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:0 18px">${textField("job-title","Job title","title",value(source,"title"),true,"text",160)}${textField("job-slug","URL slug","slug",value(source,"slug"),true,"text",160,"Lowercase letters, numbers and hyphens only.")}<div class="field"><label for="job-category">Category *</label><input id="job-category" name="category" list="job-categories" value="${esc(categoryValue)}" maxlength="100" placeholder="e.g. Data & Analytics" required>${datalist}</div>${editing ? `<div class="field"><label>Job code</label><div style="min-height:44px;border:1px solid var(--line);border-radius:3px;padding:11px 12px;background:var(--surface-subtle);font-size:13px;font-weight:700">${esc(job?.code || "Identifier pending")}</div><p class="muted">Server generated · immutable · never reused.</p></div>` : ""}</div></div></section>
      <section class="data-plane" style="margin-top:14px"><header class="section-header"><div><h2>Location &amp; employment</h2><p>Candidate-facing role facts. Work model is required before the record can be saved.</p></div><span class="section-meta">Role facts</span></header><div style="padding:4px 22px 18px"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:0 18px">${textField("job-location","Location","location",value(source,"location"),false,"text",200)}${selectField("job-work-model","Work model","workplace_type",WORK_MODELS,value(source,"workplace_type"),true)}${selectField("job-employment","Employment type","employment_type",EMPLOYMENT_TYPES,value(source,"employment_type"))}${textField("job-experience","Experience required","experience",value(source,"experience"),false,"text",200)}${textField("job-response-window","Application response window","application_response_window",value(source,"application_response_window"),false,"text",300,"Example: Expected review timeline: 5-7 business days.")}</div>${textareaField("job-location-details","Location details","location_details",value(source,"location_details"),"Optional candidate-facing location, travel or client-site context.",2000)}</div></section>
      <section class="data-plane" style="margin-top:14px"><header class="section-header"><div><h2>Skills &amp; technology</h2><p>Structured lists are rendered consistently in private preview and the published candidate page.</p></div><span class="section-meta">Candidate criteria</span></header><div style="padding:4px 22px 18px"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:0 18px">${textareaField("job-technologies","Required programming languages / technologies","technologies",listText(source.technologies),"One item per line; maximum 50.",12000)}${textareaField("job-required-skills","Required skills","required_skills",listText(source.required_skills),"One item per line; maximum 50.",16000)}${textareaField("job-preferred-skills","Preferred skills","preferred_skills",listText(source.preferred_skills),"One item per line; maximum 50.",16000)}${textareaField("job-industries","Industry context","industries",listText(source.industries),"One item per line; maximum 50.",12000)}</div></div></section>
      <section class="data-plane" style="margin-top:14px"><header class="section-header"><div><h2>Vacancy content</h2><p>Use approved factual content only. Public pages never synthesize missing responsibilities, qualifications or employment terms.</p></div><span class="section-meta">Public copy</span></header><div style="padding:4px 22px 18px">${textareaField("job-summary","Job summary","summary",value(source,"summary"),"Concise candidate-facing summary. Maximum 500 characters.",500)}${textareaField("job-description","Job description","description",value(source,"description"),"Use blank lines to separate paragraphs.",20000)}<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:0 18px">${textareaField("job-responsibilities","Responsibilities","responsibilities",listText(source.responsibilities),"One item per line; required before publishing.",16000)}${textareaField("job-qualifications","Qualifications","qualifications",listText(source.qualifications),"One item per line; required before publishing.",16000)}${textareaField("job-preferred-qualifications","Preferred qualifications","preferred_qualifications",listText(source.preferred_qualifications),"One item per line.",16000)}${textareaField("job-benefits","Benefits & employment terms","benefits",listText(source.benefits),"One item per line.",12000)}${textareaField("job-working-style","Nature of working style","working_style_details",listText(source.working_style_details),"One item per line.",12000)}</div></div></section>
      <section class="data-plane" style="margin-top:14px"><header class="section-header"><div><h2>Publication window</h2><p>Times are entered and interpreted in Europe/London. Future opening dates keep a published record hidden until the opening time.</p></div><span class="section-meta">Europe/London</span></header><div style="padding:4px 22px 18px"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:0 18px">${textField("job-opens","Opening date & time","opens_at",londonInput(source.opens_at),false,"datetime-local",32)}${textField("job-closes","Closing date & time","closes_at",londonInput(source.closes_at),false,"datetime-local",32)}</div></div></section>
      <div class="actions"><button class="btn" type="submit">${editing ? "Save changes" : "Create draft"}</button>${editing ? `<a class="btn secondary" href="${basePath}/jobs/${esc(job?.id || "")}/preview">Preview</a>` : ""}<a class="btn secondary" href="${basePath}/jobs">Cancel</a></div>
    </form>${editing ? `<div class="readonly-note">${icon("info")}<span>Saving a published job updates the same canonical content document used by the public candidate page. Status transitions remain separate and audited; stale versions are rejected rather than silently overwriting newer edits.</span></div>` : ""}<div class="footerline"><span>RC IT Services · Private administration</span><span>Draft-first · Server-generated identifier · Version checked</span></div></main></div>`);
}

function previewList(title: string, items: unknown, tags = false): string {
  const values = Array.isArray(items) ? items.map((item) => String(item ?? "").trim()).filter(Boolean) : [];
  if (!values.length) return "";
  if (tags) return `<section style="padding:18px 0;border-top:1px solid var(--line)"><h3 style="margin:0 0 10px;font-size:13px">${esc(title)}</h3><div style="display:flex;gap:7px;flex-wrap:wrap">${values.map((item)=>`<span style="display:inline-flex;padding:6px 9px;border:1px solid var(--line);background:var(--surface-subtle);font-size:11px">${esc(item)}</span>`).join("")}</div></section>`;
  return `<section style="padding:18px 0;border-top:1px solid var(--line)"><h3 style="margin:0 0 10px;font-size:13px">${esc(title)}</h3><ul style="margin:0;padding-left:20px;line-height:1.65;font-size:12px">${values.map((item)=>`<li>${esc(item)}</li>`).join("")}</ul></section>`;
}

function fact(label: string, current: unknown): string {
  if (current == null || String(current).trim() === "") return "";
  return `<div style="padding:12px;border:1px solid var(--line);background:var(--surface-subtle)"><span style="display:block;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.05em">${esc(label)}</span><strong style="display:block;margin-top:5px;font-size:12px">${esc(current)}</strong></div>`;
}

export function jobPreviewPage(basePath: string, session: AdminSessionView, job: JobRecord): Response {
  const paragraphs = String(job.description || "").split(/\n\s*\n/).map((item)=>item.trim()).filter(Boolean);
  const facts = [fact("Job code", job.code), fact("Location", job.location), fact("Work model", job.workplace_type), fact("Employment type", job.employment_type), fact("Experience", job.experience), fact("Application response window", job.application_response_window), job.published_at ? fact("Posted", prettyTime(job.published_at)) : "", job.closes_at ? fact("Closing", prettyTime(job.closes_at)) : ""].join("");
  return shell("Job preview", `<div class="admin-shell">${adminHeader(basePath, session, "jobs")}${workspaceBar("Private vacancy preview")}
  <main class="workspace" id="main-content" aria-labelledby="job-preview-title"><div class="page-heading"><div><div class="eyebrow">Private preview · ${esc(job.status || "draft")}</div><h1 id="job-preview-title">${esc(job.title || "Untitled vacancy")}</h1><p>${esc(job.summary || "No summary has been provided yet.")}</p></div><div class="snapshot"><strong>${esc(job.code || "Identifier pending")}</strong>${esc(job.category_name || "Uncategorised")}<br>Version ${esc(job.version ?? 1)}</div></div>
    <section class="data-plane"><header class="section-header"><div><h2>Canonical candidate-content preview</h2><p>This private noindex route consumes the same authoritative job content document used by the public Careers page.</p></div>${statusBadge(job.status)}</header><div style="padding:22px;max-width:980px"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:10px;margin-bottom:20px">${facts}</div>${previewList("Technology environment",job.technologies,true)}${previewList("Required skills",job.required_skills)}${previewList("Preferred skills",job.preferred_skills)}${previewList("Industry context",job.industries,true)}${paragraphs.length ? `<section style="padding:18px 0;border-top:1px solid var(--line)"><h3 style="margin:0 0 10px;font-size:13px">Job description</h3>${paragraphs.map((paragraph)=>`<p style="font-size:12px;line-height:1.7">${esc(paragraph)}</p>`).join("")}</section>` : ""}${previewList("Key responsibilities",job.responsibilities)}${previewList("Qualifications",job.qualifications)}${previewList("Preferred qualifications",job.preferred_qualifications)}${previewList("Benefits & employment terms",job.benefits)}${previewList("Nature of working style",job.working_style_details)}${job.location_details ? `<section style="padding:18px 0;border-top:1px solid var(--line)"><h3 style="margin:0 0 10px;font-size:13px">Location</h3><p style="font-size:12px;line-height:1.7">${esc(job.location_details)}</p></section>` : ""}</div></section>
    <div class="actions"><a class="btn" href="${basePath}/jobs/${esc(job.id || "")}/edit">Edit job</a><a class="btn secondary" href="${basePath}/jobs">Back to jobs</a></div><div class="footerline"><span>RC IT Services · Private preview</span><span>No-cache · No-index · Canonical content contract</span></div></main></div>`);
}

export function jobDeletePage(basePath: string, session: AdminSessionView, job: JobRecord, message = "", error = false): Response {
  const eligible = job.status === "draft" && !job.published_at && Number(job.application_count || 0) === 0;
  return shell("Delete job draft", `<div class="admin-shell">${adminHeader(basePath, session, "jobs")}${workspaceBar("Delete draft")}
  <main class="workspace" id="main-content" aria-labelledby="delete-job-title"><div class="page-heading"><div><div class="eyebrow">Irreversible action</div><h1 id="delete-job-title">Delete ${esc(job.title || "job draft")}</h1><p>Permanent deletion is intentionally restricted. Published history and jobs with applications must be closed or archived instead. The generated job code remains permanently retired and is never reused.</p></div>${statusBadge(job.status)}</div>${notice(message,error)}
  <section class="data-plane"><header class="section-header"><div><h2>Deletion policy</h2><p>Only a never-published draft with zero applications may be deleted.</p></div><span class="section-meta">${eligible ? "Eligible" : "Blocked"}</span></header><div style="padding:22px;max-width:720px">${eligible ? `<p style="font-size:12px;line-height:1.65">To confirm permanent deletion, type the exact slug <strong>${esc(job.slug || "")}</strong>.</p><form method="post" action="${basePath}/jobs/${esc(job.id || "")}/delete"><input type="hidden" name="csrf" value="${esc(session.csrf)}"><input type="hidden" name="expected_version" value="${esc(job.version ?? 1)}"><div class="field"><label for="confirm-slug">Confirm slug</label><input id="confirm-slug" name="confirm_slug" autocomplete="off" required></div><div class="actions"><button class="btn" type="submit">Permanently delete draft</button><a class="btn secondary" href="${basePath}/jobs/${esc(job.id || "")}/edit">Cancel</a></div></form>` : `<div class="msg error">This record does not satisfy the deletion policy. Return to Job management and use the appropriate status transition.</div><a class="btn secondary" href="${basePath}/jobs">Back to jobs</a>`}</div></section></main></div>`, eligible ? 200 : 409);
}

function splitLines(value: FormDataEntryValue | null, field: string, errors: string[]): string[] {
  const lines = String(value ?? "").split(/\r?\n/).map((item)=>item.trim()).filter(Boolean);
  if (lines.length > 50) errors.push(`${field} allows a maximum of 50 items.`);
  if (lines.some((item)=>item.length > 400)) errors.push(`${field} contains an item longer than 400 characters.`);
  return [...new Set(lines)].slice(0,50);
}

export function jobPayloadFromForm(form: FormData): { payload: Record<string, unknown>; errors: string[] } {
  const errors: string[] = [];
  const title = String(form.get("title") ?? "").trim();
  const slug = String(form.get("slug") ?? "").trim().toLowerCase();
  const category = String(form.get("category") ?? "").trim();
  const summary = String(form.get("summary") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const location = String(form.get("location") ?? "").trim();
  const workplaceType = String(form.get("workplace_type") ?? "").trim().toLowerCase();
  const employmentType = String(form.get("employment_type") ?? "").trim().toLowerCase();
  const experience = String(form.get("experience") ?? "").trim();
  const responseWindow = String(form.get("application_response_window") ?? "").trim();
  const locationDetails = String(form.get("location_details") ?? "").trim();
  const opensAt = String(form.get("opens_at") ?? "").trim();
  const closesAt = String(form.get("closes_at") ?? "").trim();

  if (title.length < 3 || title.length > 160) errors.push("Title must be between 3 and 160 characters.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 160) errors.push("Slug must use lowercase letters, numbers and hyphens only.");
  if (!category || category.length > 100) errors.push("Category is required and must be 100 characters or fewer.");
  if (summary.length > 500 || description.length > 20000 || location.length > 200 || experience.length > 200 || responseWindow.length > 300 || locationDetails.length > 2000) errors.push("One or more job fields exceed the allowed length.");
  if (!workplaceType || !WORK_MODELS.some(([current])=>current === workplaceType)) errors.push("Work model is required and invalid.");
  if (employmentType && !EMPLOYMENT_TYPES.some(([current])=>current === employmentType)) errors.push("Employment type is invalid.");
  for (const [label, current] of [["Opening date",opensAt],["Closing date",closesAt]] as const) {
    if (current && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(current)) errors.push(`${label} is invalid.`);
  }

  return {
    errors,
    payload: {
      title, slug, category, summary, description, location,
      workplace_type: workplaceType, employment_type: employmentType, experience,
      application_response_window: responseWindow,
      location_details: locationDetails,
      technologies: splitLines(form.get("technologies"), "Technologies", errors),
      required_skills: splitLines(form.get("required_skills"), "Required skills", errors),
      preferred_skills: splitLines(form.get("preferred_skills"), "Preferred skills", errors),
      industries: splitLines(form.get("industries"), "Industry context", errors),
      responsibilities: splitLines(form.get("responsibilities"), "Responsibilities", errors),
      qualifications: splitLines(form.get("qualifications"), "Qualifications", errors),
      preferred_qualifications: splitLines(form.get("preferred_qualifications"), "Preferred qualifications", errors),
      benefits: splitLines(form.get("benefits"), "Benefits", errors),
      working_style_details: splitLines(form.get("working_style_details"), "Nature of working style", errors),
      opens_at: opensAt, closes_at: closesAt
    }
  };
}
