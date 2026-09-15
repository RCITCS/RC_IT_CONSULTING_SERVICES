import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const sensitiveRoots = [
  "supabase/functions/admin-auth",
  "supabase/functions/transactional-email",
  "supabase/functions/candidate-applications",
  "supabase/functions/_shared",
  "src/backend/runtime",
  "worker"
];

function filesUnder(relative) {
  const start = path.join(root, relative);
  if (!fs.existsSync(start)) return [];
  const output = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(?:js|ts|mjs|json)$/i.test(entry.name)) output.push(full);
    }
  };
  walk(start);
  return output;
}

const runtimeFiles = sensitiveRoots.flatMap(filesUnder);
assert.ok(runtimeFiles.length > 10, "expected sensitive runtime source inventory");

const forbiddenSecretPatterns = [
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\bre_[A-Za-z0-9_-]{20,}\b/g,
  /\bsb_secret_[A-Za-z0-9._-]{20,}\b/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g
];

for (const file of runtimeFiles) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  for (const pattern of forbiddenSecretPatterns) {
    pattern.lastIndex = 0;
    assert.ok(!pattern.test(source), `credential-like literal found in runtime source: ${relative}`);
  }
  if (relative.startsWith(`supabase${path.sep}functions${path.sep}`)) {
    assert.ok(!/console\.(?:log|debug|info|warn|error)\s*\(/.test(source), `sensitive Edge runtime must not debug-log payloads/secrets: ${relative}`);
  }
}

const db = fs.readFileSync(path.join(root, "supabase/functions/admin-auth/db.ts"), "utf8");
const limiter = fs.readFileSync(path.join(root, "supabase/functions/admin-auth/rate-limit.ts"), "utf8");
const applications = fs.readFileSync(path.join(root, "supabase/functions/admin-auth/applications.ts"), "utf8");
const transactional = fs.readFileSync(path.join(root, "supabase/functions/transactional-email/index.ts"), "utf8");
const resend = fs.readFileSync(path.join(root, "supabase/functions/_shared/resend-email-provider.js"), "utf8");
const secretWorkflow = fs.readFileSync(path.join(root, ".github/workflows/phase13-secret-availability.yml"), "utf8");

for (const source of [db, limiter, applications, transactional]) {
  assert.ok(source.includes('Deno.env.get("SUPABASE_SECRET_KEYS")'), "server runtimes must prefer managed modern Supabase secret keys");
  assert.ok(source.includes("MODERN_SECRET_KEY || LEGACY_SERVICE_ROLE_KEY"), "legacy service key may exist only as compatibility fallback");
}
assert.ok(transactional.includes('Deno.env.get("RESEND_API_KEY")'), "transactional email provider key must come from runtime secret storage");
assert.ok(resend.includes('authorization: `Bearer ${secret}`'), "Resend credential must be applied only at provider request boundary");
assert.ok(!resend.includes("console."), "provider adapter must not log provider credentials or response payloads");
assert.ok(resend.includes("Email provider rejected the request."), "provider failures must remain sanitized");

assert.ok(secretWorkflow.includes("Report presence only"), "secret availability workflow must report presence only");
assert.ok(secretWorkflow.includes("RESEND_API_KEY_PRESENT=true"), "secret workflow may expose only boolean presence");
assert.ok(secretWorkflow.includes("SUPABASE_ACCESS_TOKEN_PRESENT=true"), "secret workflow may expose only boolean presence");
assert.ok(!secretWorkflow.includes('echo "$RESEND_API_KEY"'), "secret workflow must never print the Resend secret");
assert.ok(!secretWorkflow.includes('echo "$SUPABASE_ACCESS_TOKEN"'), "secret workflow must never print the Supabase access token");

console.log("Phase 16.10 secrets, configuration and sensitive logging review: PASS");
