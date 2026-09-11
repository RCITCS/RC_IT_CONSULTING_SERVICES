import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  CANDIDATE_CONSENT_VERSION,
  CANDIDATE_DOCUMENT_BUCKET,
  MAX_CANDIDATE_JSON_BYTES,
  TUS_CHUNK_BYTES,
  normalizeCandidateEmail,
  validateCandidateIdentity,
  validateCandidateStartRequest,
  validateIntakeToken,
} from "../_shared/candidate-application-contract.js";
import {
  buildCandidateDocumentPath,
  inspectCandidateDocument,
} from "../_shared/candidate-document-contract.js";

const SERVICE = "candidate-applications";
const CONTRACT = "phase12-candidate-intake-v1";
const ALLOWED_PROXIES = new Set(["cloudflare", "vercel"]);
const ALLOWED_ORIGINS = new Set([
  "https://rcitcservices.frsmkgit.workers.dev",
  "https://rc-it-services.vercel.app",
  "https://www.rcitcs.com",
  "https://rcitcs.com",
]);
const MAX_DOCUMENT_DOWNLOAD_BYTES = 20 * 1024 * 1024;

function responseHeaders(contentType = "application/json; charset=utf-8"): Headers {
  return new Headers({
    "content-type": contentType,
    "cache-control": "no-store, max-age=0, must-revalidate",
    pragma: "no-cache",
    expires: "0",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    "cross-origin-resource-policy": "same-site",
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

function publicStorageKey(): string {
  return String(Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "").trim();
}

function dataApiHeaders(key: string): HeadersInit {
  return {
    apikey: key,
    ...(key.startsWith("sb_secret_") ? {} : { authorization: `Bearer ${key}` }),
    "content-type": "application/json",
    accept: "application/json",
  };
}

function storageHeaders(key: string, contentType = "application/json"): HeadersInit {
  return {
    apikey: key,
    ...(key.startsWith("sb_secret_") ? {} : { authorization: `Bearer ${key}` }),
    "content-type": contentType,
    "cache-control": "no-store",
  };
}

function encodedObjectPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function storageOrigin(supabaseUrl: string): string {
  const host = new URL(supabaseUrl).hostname;
  const projectRef = host.split(".")[0];
  if (!/^[a-z0-9]+$/i.test(projectRef)) throw new Error("invalid project host");
  return `https://${projectRef}.storage.supabase.co`;
}

function normalizeOrigin(value: string | null): string {
  if (!value || value === "null") return "";
  try { return new URL(value).origin; } catch { return ""; }
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.length !== rightBytes.length) return false;
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index];
  return difference === 0;
}

function bearerCredential(request: Request): string {
  const authorization = String(request.headers.get("authorization") ?? "").trim();
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match ? match[1].trim() : "";
}

function requestBoundary(request: Request, serviceKey: string): { ok: true; proxy: string; origin: string; clientIp: string } | { ok: false } {
  const presented = bearerCredential(request);
  if (!serviceKey || !presented || !constantTimeEqual(presented, serviceKey)) return { ok: false };
  const proxy = String(request.headers.get("x-rcitcs-application-proxy") ?? "").trim().toLowerCase();
  const origin = normalizeOrigin(request.headers.get("x-rcitcs-original-origin"));
  const clientIp = String(request.headers.get("x-rcitcs-client-ip") ?? "").split(",")[0].trim();
  if (!ALLOWED_PROXIES.has(proxy) || !ALLOWED_ORIGINS.has(origin) || !clientIp || clientIp.length > 64) return { ok: false };
  return { ok: true, proxy, origin, clientIp };
}

async function boundedJson(request: Request): Promise<Record<string, unknown>> {
  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
  if (!contentType.startsWith("application/json")) throw Object.assign(new Error("unsupported media type"), { status: 415, code: "UNSUPPORTED_MEDIA_TYPE" });
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    const size = Number(declared);
    if (!Number.isFinite(size) || size < 0 || size > MAX_CANDIDATE_JSON_BYTES) {
      throw Object.assign(new Error("payload too large"), { status: 413, code: "PAYLOAD_TOO_LARGE" });
    }
  }
  if (!request.body) return {};
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_CANDIDATE_JSON_BYTES) {
        await reader.cancel();
        throw Object.assign(new Error("payload too large"), { status: 413, code: "PAYLOAD_TOO_LARGE" });
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    try { reader.releaseLock(); } catch { /* no-op */ }
  }
  try {
    const parsed = JSON.parse(text || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new TypeError("object required");
    return parsed as Record<string, unknown>;
  } catch {
    throw Object.assign(new Error("invalid json"), { status: 400, code: "INVALID_JSON" });
  }
}

async function sha256Hex(value: string | Uint8Array): Promise<string> {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function rpc(supabaseUrl: string, key: string, name: string, payload: Record<string, unknown>): Promise<any> {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, { method: "POST", headers: dataApiHeaders(key), body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`database rpc ${name} failed`);
  return response.json();
}

async function createSignedUploadToken(supabaseUrl: string, key: string, objectPath: string): Promise<string> {
  const response = await fetch(`${supabaseUrl}/storage/v1/object/upload/sign/${encodeURIComponent(CANDIDATE_DOCUMENT_BUCKET)}/${encodedObjectPath(objectPath)}`, {
    method: "POST", headers: storageHeaders(key), body: "{}",
  });
  if (!response.ok) throw new Error("signed upload token creation failed");
  const data = await response.json() as Record<string, unknown>;
  const candidate = String(data.url ?? data.signedURL ?? data.signedUrl ?? "");
  if (!candidate) throw new Error("signed upload token missing");
  const url = new URL(candidate, `${supabaseUrl}/storage/v1`);
  const token = url.searchParams.get("token") ?? "";
  if (!token) throw new Error("signed upload token missing");
  return token;
}

async function deleteObjects(supabaseUrl: string, key: string, paths: string[]): Promise<void> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${encodeURIComponent(CANDIDATE_DOCUMENT_BUCKET)}`, {
    method: "DELETE", headers: storageHeaders(key), body: JSON.stringify({ prefixes: unique }),
  });
  if (!response.ok) throw new Error("storage cleanup failed");
}

async function readBoundedObject(supabaseUrl: string, key: string, objectPath: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${supabaseUrl}/storage/v1/object/${encodeURIComponent(CANDIDATE_DOCUMENT_BUCKET)}/${encodedObjectPath(objectPath)}`, {
      method: "GET", headers: storageHeaders(key, "application/octet-stream"), cache: "no-store", signal: controller.signal,
    });
    if (!response.ok || !response.body) throw new Error("candidate document unavailable");
    const declared = response.headers.get("content-length");
    if (declared !== null) {
      const size = Number(declared);
      if (!Number.isFinite(size) || size < 1 || size > MAX_DOCUMENT_DOWNLOAD_BYTES) throw new RangeError("candidate document size invalid");
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_DOCUMENT_DOWNLOAD_BYTES) {
          await reader.cancel();
          throw new RangeError("candidate document too large");
        }
        chunks.push(value);
      }
    } finally {
      try { reader.releaseLock(); } catch { /* no-op */ }
    }
    if (!total) throw new RangeError("candidate document empty");
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return { bytes, contentType: String(response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() };
  } finally {
    clearTimeout(timer);
  }
}

function mapBusinessFailure(result: any): Response | null {
  if (result?.ok !== false) return null;
  const code = String(result.code ?? "APPLICATION_REJECTED");
  if (code === "DUPLICATE_APPLICATION") return json({ ok: false, code, message: "An application for this vacancy has already been received for this email address." }, 409);
  if (code === "RATE_LIMITED") return json({ ok: false, code, message: "Too many application attempts. Please try again later." }, 429, { "retry-after": "900" });
  if (code === "JOB_UNAVAILABLE") return json({ ok: false, code, message: "This vacancy is no longer accepting applications." }, 409);
  if (["INTAKE_EXPIRED", "INTAKE_CANCELLED", "INVALID_INTAKE"].includes(code)) return json({ ok: false, code, message: "This application session is no longer valid. Start the application again." }, 410);
  if (["INVALID_REQUEST", "INVALID_DOCUMENT_MANIFEST", "INVALID_CANDIDATE", "INVALID_DOCUMENTS", "CANDIDATE_MISMATCH"].includes(code)) return json({ ok: false, code, message: "The application could not be validated." }, 422);
  return json({ ok: false, code: "APPLICATION_REJECTED", message: "The application could not be completed." }, 409);
}

async function startApplication({ body, boundary, supabaseUrl, serviceKey, storageApiKey }: any): Promise<Response> {
  const validated = validateCandidateStartRequest(body);
  if (!validated.ok) return json({ ok: false, code: "VALIDATION_ERROR", errors: validated.errors }, 422);
  const intakeId = crypto.randomUUID();
  const intakeToken = randomToken();
  const tokenHash = await sha256Hex(intakeToken);
  const emailHash = await sha256Hex(normalizeCandidateEmail(validated.candidate.email));
  const ipHash = await sha256Hex(boundary.clientIp);
  const manifest = validated.documents.map((document: any) => {
    const id = crypto.randomUUID();
    return {
      id, kind: document.kind, original_filename: document.original_filename, mime_type: document.mime_type,
      size_bytes: document.size_bytes, extension: document.extension,
      object_path: buildCandidateDocumentPath({ applicationId: intakeId, documentId: id, extension: document.extension }),
    };
  });
  const result = await rpc(supabaseUrl, serviceKey, "begin_candidate_application_intake", {
    p_intake_id: intakeId, p_job_slug: validated.jobSlug, p_token_hash: tokenHash,
    p_email_hash: emailHash, p_ip_hash: ipHash, p_document_manifest: manifest,
  });
  const businessFailure = mapBusinessFailure(result);
  if (businessFailure) return businessFailure;
  try {
    const signedDocuments = [];
    for (const document of manifest) {
      const signature = await createSignedUploadToken(supabaseUrl, serviceKey, document.object_path);
      signedDocuments.push({
        kind: document.kind, objectPath: document.object_path, fileName: document.original_filename,
        mimeType: document.mime_type, sizeBytes: document.size_bytes, signature,
      });
    }
    return json({
      ok: true, intakeToken, expiresAt: result.expires_at, consentVersion: CANDIDATE_CONSENT_VERSION, job: result.job,
      upload: {
        endpoint: `${storageOrigin(supabaseUrl)}/storage/v1/upload/resumable`,
        apiKey: storageApiKey,
        bucket: CANDIDATE_DOCUMENT_BUCKET,
        chunkSize: TUS_CHUNK_BYTES,
        documents: signedDocuments,
      },
    }, 201);
  } catch {
    try { await rpc(supabaseUrl, serviceKey, "cancel_candidate_application_intake", { p_token_hash: tokenHash }); } catch { /* best effort */ }
    return json({ ok: false, code: "UPLOAD_SERVICE_UNAVAILABLE", message: "Secure document upload could not be prepared. Please try again." }, 503);
  }
}

async function finalizeApplication({ body, boundary, request, supabaseUrl, serviceKey }: any): Promise<Response> {
  const intakeToken = validateIntakeToken(body.intakeToken ?? body.intake_token);
  if (!intakeToken) return json({ ok: false, code: "INVALID_INTAKE", message: "The application session is invalid." }, 422);
  const candidateValidation = validateCandidateIdentity(body.candidate ?? body);
  if (!candidateValidation.ok) return json({ ok: false, code: "VALIDATION_ERROR", errors: candidateValidation.errors }, 422);
  const tokenHash = await sha256Hex(intakeToken);
  const intake = await rpc(supabaseUrl, serviceKey, "get_candidate_application_intake", { p_token_hash: tokenHash });
  const intakeFailure = mapBusinessFailure(intake);
  if (intakeFailure) return intakeFailure;
  if (intake.completed === true) {
    return json({ ok: true, idempotent: true, reference: intake.reference, submittedAt: intake.submitted_at, job: intake.job });
  }

  const intakeDocuments = Array.isArray(intake.documents) ? intake.documents : [];
  const hasCoverLetterDocument = intakeDocuments.some((document: any) => String(document?.kind ?? "") === "cover_letter");
  if (!candidateValidation.value.cover_letter_text && !hasCoverLetterDocument) {
    try {
      await deleteObjects(supabaseUrl, serviceKey, intakeDocuments.map((document: any) => String(document.object_path ?? "")));
      await rpc(supabaseUrl, serviceKey, "cancel_candidate_application_intake", { p_token_hash: tokenHash });
    } catch { /* scheduled cleanup remains authoritative */ }
    return json({ ok: false, code: "VALIDATION_ERROR", errors: [{ field: "coverLetter", code: "COVER_LETTER_REQUIRED" }] }, 422);
  }

  const emailHash = await sha256Hex(normalizeCandidateEmail(candidateValidation.value.email));
  if (emailHash !== intake.email_hash) {
    try {
      await deleteObjects(supabaseUrl, serviceKey, intakeDocuments.map((document: any) => String(document.object_path ?? "")));
      await rpc(supabaseUrl, serviceKey, "cancel_candidate_application_intake", { p_token_hash: tokenHash });
    } catch { /* cleanup is best effort */ }
    return json({ ok: false, code: "CANDIDATE_MISMATCH", message: "The application identity does not match the secure upload session." }, 422);
  }

  const verifiedDocuments = [];
  try {
    for (const expected of intakeDocuments) {
      const objectPath = String(expected.object_path ?? "");
      const object = await readBoundedObject(supabaseUrl, serviceKey, objectPath);
      const expectedMime = String(expected.mime_type ?? "").toLowerCase();
      if (object.contentType && object.contentType !== expectedMime) throw new TypeError("stored MIME mismatch");
      if (object.bytes.byteLength !== Number(expected.size_bytes)) throw new TypeError("stored size mismatch");
      const inspection = inspectCandidateDocument({ fileName: String(expected.original_filename ?? ""), mimeType: expectedMime, bytes: object.bytes });
      if (!inspection.ok) throw new TypeError(inspection.code);
      verifiedDocuments.push({
        id: expected.id, kind: expected.kind, object_path: objectPath, original_filename: expected.original_filename,
        mime_type: expectedMime, size_bytes: object.bytes.byteLength, sha256: await sha256Hex(object.bytes),
      });
    }
  } catch {
    try {
      await deleteObjects(supabaseUrl, serviceKey, intakeDocuments.map((document: any) => String(document.object_path ?? "")));
      await rpc(supabaseUrl, serviceKey, "cancel_candidate_application_intake", { p_token_hash: tokenHash });
    } catch { /* best effort */ }
    return json({ ok: false, code: "DOCUMENT_VALIDATION_FAILED", message: "One or more uploaded documents failed secure validation. Start the application again." }, 422);
  }

  const ipHash = await sha256Hex(boundary.clientIp);
  const result = await rpc(supabaseUrl, serviceKey, "finalize_candidate_application", {
    p_token_hash: tokenHash, p_payload: candidateValidation.value, p_documents: verifiedDocuments,
    p_ip_hash: ipHash, p_user_agent: String(request.headers.get("user-agent") ?? "").slice(0, 500),
  });
  const businessFailure = mapBusinessFailure(result);
  if (businessFailure) {
    if (["DUPLICATE_APPLICATION", "JOB_UNAVAILABLE", "INTAKE_EXPIRED", "CANDIDATE_MISMATCH", "INVALID_DOCUMENTS", "INVALID_CANDIDATE"].includes(String(result?.code ?? ""))) {
      try {
        await deleteObjects(supabaseUrl, serviceKey, intakeDocuments.map((document: any) => String(document.object_path ?? "")));
        await rpc(supabaseUrl, serviceKey, "cancel_candidate_application_intake", { p_token_hash: tokenHash });
      } catch { /* best effort */ }
    }
    return businessFailure;
  }
  return json({
    ok: true, idempotent: Boolean(result.idempotent), reference: result.reference, submittedAt: result.submitted_at,
    responseWindow: result.response_window ?? null, job: result.job,
  }, 201);
}

async function cancelApplication({ body, supabaseUrl, serviceKey }: any): Promise<Response> {
  const intakeToken = validateIntakeToken(body.intakeToken ?? body.intake_token);
  if (!intakeToken) return json({ ok: false, code: "INVALID_INTAKE" }, 422);
  const tokenHash = await sha256Hex(intakeToken);
  const result = await rpc(supabaseUrl, serviceKey, "cancel_candidate_application_intake", { p_token_hash: tokenHash });
  const failure = mapBusinessFailure(result);
  if (failure) return failure;
  try {
    await deleteObjects(supabaseUrl, serviceKey, (result.documents ?? []).map((document: any) => String(document.object_path ?? "")));
  } catch {
    return json({ ok: false, code: "CLEANUP_PENDING", message: "The application session was cancelled, but secure document cleanup is pending." }, 202);
  }
  return json({ ok: true, cancelled: true });
}

Deno.serve(async (request: Request) => {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname.endsWith("/health")) return json({ ok: true, service: SERVICE, contract: CONTRACT });
  if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405, { allow: "POST" });
  const supabaseUrl = String(Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
  const serviceKey = serviceCredential();
  const storageApiKey = publicStorageKey();
  if (!supabaseUrl || !serviceKey || !storageApiKey) return json({ ok: false, code: "SERVICE_UNAVAILABLE" }, 503);
  const boundary = requestBoundary(request, serviceKey);
  if (!boundary.ok) return json({ ok: false, code: "REQUEST_REJECTED" }, 403);
  let body: Record<string, unknown>;
  try { body = await boundedJson(request); }
  catch (error: any) { return json({ ok: false, code: error?.code ?? "INVALID_REQUEST" }, Number(error?.status ?? 400)); }
  const action = String(body.action ?? "").trim().toLowerCase();
  if (!["start", "finalize", "cancel"].includes(action)) return json({ ok: false, code: "INVALID_ACTION" }, 400);
  try {
    if (action === "start") return await startApplication({ body, boundary, request, supabaseUrl, serviceKey, storageApiKey });
    if (action === "finalize") return await finalizeApplication({ body, boundary, request, supabaseUrl, serviceKey });
    return await cancelApplication({ body, boundary, request, supabaseUrl, serviceKey });
  } catch {
    return json({ ok: false, code: "SERVICE_UNAVAILABLE", message: "Candidate application service is temporarily unavailable." }, 503);
  }
});
