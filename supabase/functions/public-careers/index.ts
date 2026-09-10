import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MAX_BODY_BYTES = 2_048;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function responseHeaders(contentType = "application/json; charset=utf-8"): Headers {
  return new Headers({
    "content-type": contentType,
    "cache-control": "no-store, max-age=0, must-revalidate",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  });
}

function json(body: unknown, status = 200, extra?: HeadersInit): Response {
  const headers = responseHeaders();
  if (extra) new Headers(extra).forEach((value, key) => headers.set(key, value));
  return new Response(JSON.stringify(body), { status, headers });
}

function modernSecret(): string {
  try {
    const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (!raw) return "";
    const keys = JSON.parse(raw) as Record<string, unknown>;
    return String(keys.default ?? Object.values(keys)[0] ?? "").trim();
  } catch {
    return "";
  }
}

function serviceCredential(): string {
  return modernSecret() || String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
}

function dataApiHeaders(key: string): HeadersInit {
  return {
    apikey: key,
    ...(key.startsWith("sb_secret_") ? {} : { authorization: `Bearer ${key}` }),
    "content-type": "application/json",
    accept: "application/json",
  };
}

async function boundedBody(request: Request): Promise<string> {
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    const length = Number(declared);
    if (!Number.isFinite(length) || length < 0 || length > MAX_BODY_BYTES) throw new RangeError("request too large");
  }

  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RangeError("request too large");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    try { reader.releaseLock(); } catch { /* no-op */ }
  }
}

function cleanListJob(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  return {
    id: row.id ?? null,
    code: row.code ?? null,
    slug: row.slug ?? null,
    title: row.title ?? null,
    category: row.category ?? null,
    location: row.location ?? null,
    workplace_type: row.workplace_type ?? null,
    employment_type: row.employment_type ?? null,
    experience: row.experience ?? null,
  };
}

function cleanSelectedJob(value: unknown): Record<string, unknown> | null {
  const base = cleanListJob(value);
  if (!base || !value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  return {
    ...base,
    summary: row.summary ?? null,
    description: row.description ?? null,
    technologies: Array.isArray(row.technologies) ? row.technologies : [],
    required_skills: Array.isArray(row.required_skills) ? row.required_skills : [],
    preferred_skills: Array.isArray(row.preferred_skills) ? row.preferred_skills : [],
    industries: Array.isArray(row.industries) ? row.industries : [],
    responsibilities: Array.isArray(row.responsibilities) ? row.responsibilities : [],
    qualifications: Array.isArray(row.qualifications) ? row.qualifications : [],
    preferred_qualifications: Array.isArray(row.preferred_qualifications) ? row.preferred_qualifications : [],
    benefits: Array.isArray(row.benefits) ? row.benefits : [],
    working_style_details: Array.isArray(row.working_style_details) ? row.working_style_details : [],
    location_details: row.location_details ?? null,
    application_response_window: row.application_response_window ?? null,
    opens_at: row.opens_at ?? null,
    published_at: row.published_at ?? null,
    closes_at: row.closes_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

function publicProjection(value: unknown): { jobs: Record<string, unknown>[]; selected: Record<string, unknown> | null } {
  const payload = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const jobs = Array.isArray(payload.jobs)
    ? payload.jobs.map(cleanListJob).filter((row): row is Record<string, unknown> => Boolean(row))
    : [];
  return { jobs, selected: cleanSelectedJob(payload.selected) };
}

Deno.serve(async (request: Request) => {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname.endsWith("/health")) {
    return json({ ok: true, service: "public-careers", contract: "phase11-public-read-v1" });
  }

  if (request.method !== "POST") {
    return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405, { allow: "POST" });
  }

  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return json({ ok: false, code: "UNSUPPORTED_MEDIA_TYPE" }, 415);
  }

  let raw = "";
  try {
    raw = await boundedBody(request);
  } catch (error) {
    if (error instanceof RangeError) return json({ ok: false, code: "PAYLOAD_TOO_LARGE" }, 413);
    return json({ ok: false, code: "INVALID_REQUEST" }, 400);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new TypeError("object required");
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ ok: false, code: "INVALID_JSON" }, 400);
  }

  const slugValue = body.slug;
  const slug = slugValue == null || String(slugValue).trim() === "" ? null : String(slugValue).trim().toLowerCase();
  if (slug !== null && (slug.length > 160 || !SLUG.test(slug))) {
    return json({ ok: false, code: "INVALID_SLUG" }, 400);
  }

  const supabaseUrl = String(Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
  const key = serviceCredential();
  if (!supabaseUrl || !key) return json({ ok: false, code: "SERVICE_UNAVAILABLE" }, 503);

  try {
    const upstream = await fetch(`${supabaseUrl}/rest/v1/rpc/get_public_careers_context`, {
      method: "POST",
      headers: dataApiHeaders(key),
      body: JSON.stringify({ p_slug: slug }),
    });
    if (!upstream.ok) return json({ ok: false, code: "SERVICE_UNAVAILABLE" }, 503);
    const payload = await upstream.json();
    return json(publicProjection(payload));
  } catch {
    return json({ ok: false, code: "SERVICE_UNAVAILABLE" }, 503);
  }
});
