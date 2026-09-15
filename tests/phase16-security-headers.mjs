import assert from "node:assert/strict";
import fs from "node:fs";

const ui = fs.readFileSync(new URL("../supabase/functions/admin-auth/ui.ts", import.meta.url), "utf8");
const index = fs.readFileSync(new URL("../supabase/functions/admin-auth/index.ts", import.meta.url), "utf8");
const applications = fs.readFileSync(new URL("../supabase/functions/admin-auth/applications.ts", import.meta.url), "utf8");
const worker = fs.readFileSync(new URL("../src/backend/runtime/worker.js", import.meta.url), "utf8");

for (const fragment of [
  '"cache-control": "no-store, max-age=0, must-revalidate"',
  '"x-robots-tag": "noindex, nofollow, noarchive, nosnippet, noimageindex"',
  '"x-content-type-options": "nosniff"',
  '"x-frame-options": "DENY"',
  '"referrer-policy": "no-referrer"',
  '"permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()"',
  '"strict-transport-security": "max-age=31536000; includeSubDomains; preload"',
  '"cross-origin-opener-policy": "same-origin"',
  '"cross-origin-resource-policy": "same-origin"'
]) assert.ok(ui.includes(fragment), `direct admin response lost security header: ${fragment}`);
assert.ok(ui.includes("default-src 'none'"), "direct admin CSP must fail closed by default");
assert.ok(ui.includes("form-action 'self'"), "direct admin CSP must restrict form targets");
assert.ok(ui.includes("frame-ancestors 'none'"), "direct admin CSP must deny framing");

for (const fragment of [
  'HttpOnly; Secure; SameSite=Strict; Priority=High',
  'HttpOnly; Secure; SameSite=Lax; Priority=High',
  'Path=${path}; Max-Age=${maxAge}',
  'const path = `${base(url)}/reset-password`'
]) assert.ok(index.includes(fragment), `admin cookie contract missing: ${fragment}`);
assert.ok(!index.includes("; Domain="), "admin cookies must remain host-only");

for (const fragment of [
  'cache: "no-store"',
  '"cache-control": "no-store, max-age=0, must-revalidate"',
  '"content-disposition": `attachment;',
  '"x-content-type-options": "nosniff"',
  '"cross-origin-resource-policy": "same-origin"',
  '"content-security-policy": "default-src \'none\'; sandbox"'
]) assert.ok(applications.includes(fragment), `private document response lost hardening: ${fragment}`);

for (const fragment of [
  "'cache-control': 'no-store, no-transform, max-age=0, must-revalidate'",
  "headers.set('pragma', 'no-cache')",
  "headers.set('expires', '0')",
  "headers.set('x-content-type-options', 'nosniff')",
  "headers.set('referrer-policy', 'no-referrer')",
  "headers.set('cross-origin-resource-policy', 'same-origin')",
  "async function proxyAdminResponse(upstream, requestMethod, publicBase)",
  "const declaredHtml = contentType.toLowerCase().includes('text/html')",
  "adminTextualCandidate(contentType)",
  "looksLikeAdminHtml(bodyText)",
  "let body = bodyForbidden ? null : upstream.body",
  "headers.set('content-type', 'text/html; charset=utf-8')",
  "return await proxyAdminResponse(upstream, request.method, publicBase)"
]) assert.ok(worker.includes(fragment), `Cloudflare admin boundary missing header/stream control: ${fragment}`);

const declaredBranch = worker.indexOf("if (!bodyForbidden && declaredHtml)");
const declaredRead = worker.indexOf("body = enhanceAdminHtml(await upstream.text(), publicBase)");
const textualBranch = worker.indexOf("else if (!bodyForbidden && adminTextualCandidate(contentType))");
const textualRead = worker.indexOf("const bodyText = await upstream.text()", textualBranch);
const binaryDefault = worker.indexOf("let body = bodyForbidden ? null : upstream.body");
assert.ok(binaryDefault >= 0, "binary/private responses must retain the upstream stream as the default body path");
assert.ok(declaredBranch > binaryDefault && declaredRead > declaredBranch, "declared HTML may be decoded only inside the declared-HTML branch");
assert.ok(textualBranch > declaredRead && textualRead > textualBranch, "media-type recovery may decode only text-like responses inside the bounded textual branch");
assert.ok(!worker.includes("const bodyText = request.method === 'HEAD' ? '' : await upstream.text()"), "gateway must not buffer/decode every admin response as text");

console.log("Phase 16.9 security headers, cookies, private caching, bounded HTML recovery and binary streaming: PASS");
