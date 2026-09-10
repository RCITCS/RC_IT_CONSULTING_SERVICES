import { shaHex } from "./crypto.js";
import {
  deleteJob,
  duplicateJob,
  jobManagementContext,
  saveJob,
  transitionJob
} from "./db.ts";
import {
  jobDeletePage,
  jobEditorPage,
  jobPayloadFromForm,
  jobPreviewPage,
  jobsListPage,
  type JobManagementContext,
  type JobRecord
} from "./jobs.ts";
import { authPage, loginPage } from "./ui.ts";

const JOB_ID = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

function redirect(location: string): Response {
  const headers = new Headers({
    location,
    "cache-control": "no-store, max-age=0, must-revalidate",
    "x-robots-tag": "noindex, nofollow, noarchive"
  });
  return new Response(null, { status: 303, headers });
}

function queryNotice(url: URL): { message: string; error: boolean } {
  const notice = url.searchParams.get("notice") ?? "";
  const error = url.searchParams.get("error") ?? "";
  const messages: Record<string, string> = {
    created: "Draft job created.",
    saved: "Job changes saved.",
    duplicated: "Job duplicated as a new draft.",
    published: "Job published.",
    unpublished: "Job returned to draft.",
    closed: "Job closed.",
    archived: "Job archived.",
    restored: "Job restored as a draft.",
    deleted: "Never-published draft permanently deleted."
  };
  const errors: Record<string, string> = {
    stale: "This job changed after the page was loaded. The latest saved version is shown; review it before trying again.",
    not_found: "The requested job no longer exists.",
    forbidden: "The requested job operation is not authorized."
  };
  if (messages[notice]) return { message: messages[notice], error: false };
  if (errors[error]) return { message: errors[error], error: true };
  return { message: "", error: false };
}

function resultMessage(result: any, fallback: string): string {
  if (result?.message && typeof result.message === "string") return result.message.slice(0, 500);
  return fallback;
}

function expectedVersion(form: FormData): number | null {
  const raw = String(form.get("expected_version") ?? "");
  if (!/^\d+$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

async function csrfOk(state: any, submitted: string): Promise<boolean> {
  return Boolean(submitted)
    && submitted === state.csrf
    && await shaHex(submitted) === state.csrf_token_hash;
}

function londonParts(date: Date): Record<string, number> {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const result: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") result[part.type] = Number(part.value);
  }
  return result;
}

function londonWallTimeToIso(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(raw);
  if (!match) throw new Error("Opening or closing date is invalid.");
  const [, year, month, day, hour, minute] = match;
  const wallMs = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0);
  let candidate = wallMs;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = londonParts(new Date(candidate));
    const projected = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second || 0);
    const delta = wallMs - projected;
    candidate += delta;
    if (delta === 0) break;
  }
  const verified = londonParts(new Date(candidate));
  if (
    verified.year !== Number(year)
    || verified.month !== Number(month)
    || verified.day !== Number(day)
    || verified.hour !== Number(hour)
    || verified.minute !== Number(minute)
  ) {
    throw new Error("The selected London time does not exist because of a daylight-saving clock change.");
  }
  return new Date(candidate).toISOString();
}

function normalizeLondonDates(payload: Record<string, unknown>, errors: string[]): Record<string, unknown> {
  const normalized = { ...payload };
  try {
    normalized.opens_at = londonWallTimeToIso(payload.opens_at);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Opening date is invalid.");
  }
  try {
    normalized.closes_at = londonWallTimeToIso(payload.closes_at);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Closing date is invalid.");
  }
  if (normalized.opens_at && normalized.closes_at && new Date(String(normalized.closes_at)) <= new Date(String(normalized.opens_at))) {
    errors.push("Closing date must be after opening date.");
  }
  return normalized;
}

function selected(context: JobManagementContext): JobRecord | null {
  return context?.selected && typeof context.selected === "object" ? context.selected : null;
}

async function contextFor(adminId: string, jobId: string | null = null): Promise<JobManagementContext> {
  const context = await jobManagementContext(adminId, jobId);
  if (!context?.ok) throw new Error("job context denied");
  return context;
}

function jobIdFrom(path: string, suffix: string): string | null {
  const match = new RegExp(`^/jobs/(${JOB_ID})/${suffix}$`, "i").exec(path);
  return match?.[1]?.toLowerCase() ?? null;
}

function isJobsPath(path: string): boolean {
  return path === "/jobs" || path === "/jobs/new" || path.startsWith("/jobs/");
}

export async function handleJobRoute({
  request,
  url,
  path,
  basePath,
  authState,
  clientHash,
  userAgent
}: {
  request: Request;
  url: URL;
  path: string;
  basePath: string;
  authState: any | null;
  clientHash: string;
  userAgent: string;
}): Promise<Response | null> {
  if (!isJobsPath(path)) return null;
  if (!authState) return loginPage(basePath, "Please sign in to continue.", true);
  if (authState.admin.role !== "super_admin") {
    return authPage("Access denied", "<h1>Access denied</h1><p>Job management requires active super administrator authority.</p>", 403);
  }

  const adminId = String(authState.admin.id);
  const queryState = queryNotice(url);

  if (request.method === "GET" && path === "/jobs") {
    const context = await contextFor(adminId);
    return jobsListPage(basePath, authState, context, url.searchParams.get("q") ?? "", url.searchParams.get("status") ?? "all", queryState.message, queryState.error);
  }

  if (request.method === "GET" && path === "/jobs/new") {
    const context = await contextFor(adminId);
    return jobEditorPage(basePath, authState, context, null, queryState.message, queryState.error);
  }

  for (const mode of ["edit", "preview", "delete"] as const) {
    const jobId = jobIdFrom(path, mode);
    if (request.method === "GET" && jobId) {
      const context = await contextFor(adminId, jobId);
      const job = selected(context);
      if (!job) return authPage("Job not found", "<h1>Job not found</h1><p>The requested vacancy record does not exist.</p>", 404);
      if (mode === "edit") return jobEditorPage(basePath, authState, context, job, queryState.message, queryState.error);
      if (mode === "preview") return jobPreviewPage(basePath, authState, job);
      return jobDeletePage(basePath, authState, job, queryState.message, queryState.error);
    }
  }

  if (request.method !== "POST") {
    const headers = new Headers({ allow: "GET, POST" });
    return authPage("Method not allowed", "<h1>Method not allowed</h1><p>This job-management route does not support the requested method.</p>", 405, headers);
  }

  const form = await request.formData();
  if (!(await csrfOk(authState, String(form.get("csrf") ?? "")))) {
    return authPage("Request rejected", "<h1>Request rejected</h1><p>Reload the administration page and try again.</p>", 403);
  }

  if (path === "/jobs/create") {
    const parsed = jobPayloadFromForm(form);
    const payload = normalizeLondonDates(parsed.payload, parsed.errors);
    if (parsed.errors.length) {
      const context = await contextFor(adminId);
      return jobEditorPage(basePath, authState, context, null, parsed.errors.join(" "), true, payload);
    }
    const result = await saveJob(adminId, null, null, payload, clientHash, userAgent);
    if (!result?.ok) {
      const context = await contextFor(adminId);
      return jobEditorPage(basePath, authState, context, null, resultMessage(result, "The draft could not be created."), true, payload);
    }
    return redirect(`${basePath}/jobs/${encodeURIComponent(result.job.id)}/edit?notice=created`);
  }

  const updateId = jobIdFrom(path, "update");
  if (updateId) {
    const version = expectedVersion(form);
    const parsed = jobPayloadFromForm(form);
    const payload = normalizeLondonDates(parsed.payload, parsed.errors);
    if (!version) parsed.errors.push("The loaded job version is invalid. Reload before saving.");
    if (parsed.errors.length) {
      const context = await contextFor(adminId, updateId);
      const job = selected(context);
      if (!job) return redirect(`${basePath}/jobs?error=not_found`);
      return jobEditorPage(basePath, authState, context, job, parsed.errors.join(" "), true, payload);
    }
    const result = await saveJob(adminId, updateId, version, payload, clientHash, userAgent);
    if (!result?.ok) {
      if (result?.code === "STALE_VERSION") return redirect(`${basePath}/jobs/${updateId}/edit?error=stale`);
      if (result?.code === "NOT_FOUND") return redirect(`${basePath}/jobs?error=not_found`);
      const context = await contextFor(adminId, updateId);
      const job = selected(context);
      if (!job) return redirect(`${basePath}/jobs?error=not_found`);
      return jobEditorPage(basePath, authState, context, job, resultMessage(result, "The job could not be saved."), true, payload);
    }
    return redirect(`${basePath}/jobs/${updateId}/edit?notice=saved`);
  }

  const transitionId = jobIdFrom(path, "transition");
  if (transitionId) {
    const version = expectedVersion(form);
    const action = String(form.get("action") ?? "").trim().toLowerCase();
    if (!version || !["publish", "unpublish", "close", "archive", "restore"].includes(action)) {
      const context = await contextFor(adminId);
      return jobsListPage(basePath, authState, context, "", "all", "The requested job transition is invalid.", true);
    }
    const result = await transitionJob(adminId, transitionId, version, action, clientHash, userAgent);
    if (!result?.ok) {
      if (result?.code === "STALE_VERSION") return redirect(`${basePath}/jobs/${transitionId}/edit?error=stale`);
      const context = await contextFor(adminId);
      return jobsListPage(basePath, authState, context, "", "all", resultMessage(result, "The job status could not be changed."), true);
    }
    const noticeByAction: Record<string, string> = { publish: "published", unpublish: "unpublished", close: "closed", archive: "archived", restore: "restored" };
    return redirect(`${basePath}/jobs?notice=${noticeByAction[action]}`);
  }

  const duplicateId = jobIdFrom(path, "duplicate");
  if (duplicateId) {
    const version = expectedVersion(form);
    if (!version) return redirect(`${basePath}/jobs/${duplicateId}/edit?error=stale`);
    const result = await duplicateJob(adminId, duplicateId, version, clientHash, userAgent);
    if (!result?.ok) {
      if (result?.code === "STALE_VERSION") return redirect(`${basePath}/jobs/${duplicateId}/edit?error=stale`);
      const context = await contextFor(adminId);
      return jobsListPage(basePath, authState, context, "", "all", resultMessage(result, "The job could not be duplicated."), true);
    }
    return redirect(`${basePath}/jobs/${encodeURIComponent(result.job.id)}/edit?notice=duplicated`);
  }

  const deleteId = jobIdFrom(path, "delete");
  if (deleteId) {
    const version = expectedVersion(form);
    const context = await contextFor(adminId, deleteId);
    const job = selected(context);
    if (!job) return redirect(`${basePath}/jobs?error=not_found`);
    if (String(form.get("confirm_slug") ?? "") !== String(job.slug ?? "")) {
      return jobDeletePage(basePath, authState, job, "The confirmation slug does not match this vacancy.", true);
    }
    if (!version) return jobDeletePage(basePath, authState, job, "The loaded job version is invalid. Reload before deleting.", true);
    const result = await deleteJob(adminId, deleteId, version, clientHash, userAgent);
    if (!result?.ok) {
      if (result?.code === "STALE_VERSION") return redirect(`${basePath}/jobs/${deleteId}/edit?error=stale`);
      return jobDeletePage(basePath, authState, job, resultMessage(result, "The draft could not be deleted."), true);
    }
    return redirect(`${basePath}/jobs?notice=deleted`);
  }

  return authPage("Not found", "<h1>Not found</h1><p>The requested job-management route does not exist.</p>", 404);
}
