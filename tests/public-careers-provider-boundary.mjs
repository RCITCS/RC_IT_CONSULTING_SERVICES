import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');

const [edge, repository, wranglerText, migration] = await Promise.all([
  read('supabase/functions/public-careers/index.ts'),
  read('src/backend/repositories/public-jobs-repository.js'),
  read('wrangler.jsonc'),
  read('supabase/migrations/20260910165000_phase_11_cms_spec_convergence.sql')
]);
const wrangler = JSON.parse(wranglerText);

for (const required of [
  'MAX_BODY_BYTES = 2_048',
  'request.body.getReader()',
  'reader.cancel()',
  'UNSUPPORTED_MEDIA_TYPE',
  'PAYLOAD_TOO_LARGE',
  'INVALID_SLUG',
  '/rest/v1/rpc/get_public_careers_context',
  'publicProjection(payload)',
  'phase11-public-read-v1'
]) assert.ok(edge.includes(required), `Public Careers Edge boundary missing: ${required}`);

assert.ok(edge.includes('SUPABASE_SECRET_KEYS'), 'Supabase-owned server boundary must consume its managed secret internally.');
assert.ok(edge.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Legacy service-role fallback remains internal to Supabase Edge runtime.');
assert.ok(!edge.includes('access-control-allow-origin'), 'Public Careers server-to-server boundary must not enable browser CORS by default.');
assert.ok(!edge.includes('Deno.env.toObject'), 'Edge boundary must not enumerate environment secrets.');
assert.ok(!edge.includes('select *'), 'Edge boundary must not introduce an unrestricted table query.');

for (const field of [
  'required_skills', 'preferred_skills', 'application_response_window',
  'responsibilities', 'qualifications', 'preferred_qualifications',
  'benefits', 'working_style_details', 'location_details'
]) assert.ok(edge.includes(field), `Public projection whitelist missing candidate field: ${field}`);

assert.ok(repository.includes('PUBLIC_CAREERS_API_URL'));
assert.ok(repository.includes("source: 'public-careers-edge'"));
assert.ok(repository.includes('body: JSON.stringify({ slug:'));
assert.ok(repository.includes("source: 'direct-supabase-server'"), 'Local/server compatibility fallback must remain explicit.');

assert.equal(
  wrangler.vars?.PUBLIC_CAREERS_API_URL,
  'https://chsizmffzpxcqhaptjeu.supabase.co/functions/v1/public-careers',
  'Cloudflare public Careers must continue using the narrow Supabase-owned public projection.'
);
assert.ok(!('SUPABASE_SECRET_KEY' in (wrangler.vars || {})), 'Privileged Supabase credentials must never be committed as plaintext Wrangler vars.');
assert.ok(!('SUPABASE_SERVICE_ROLE_KEY' in (wrangler.vars || {})), 'Legacy service-role credentials must never be committed as plaintext Wrangler vars.');
assert.ok(!(wrangler.secrets?.required || []).includes('SUPABASE_SERVICE_ROLE_KEY'), 'Cloudflare must not require the legacy service-role JWT binding.');
assert.ok(!/sb_secret_[A-Za-z0-9_-]{20,}/.test(wranglerText), 'Cloudflare configuration must never contain an actual Supabase secret value.');
assert.ok(!/service_role\s*[:=]/i.test(wranglerText), 'Cloudflare configuration must never contain a service-role credential assignment.');

assert.ok(migration.includes('get_public_careers_context'));
assert.ok(migration.includes('security invoker'));
assert.ok(!/grant\s+execute[\s\S]{0,180}\bto\s+(?:anon|authenticated)\b/i.test(migration), 'Phase 11 database RPC must remain unavailable to browser roles.');

console.log('PASS: Phase 11 public Careers remains on its bounded Supabase-owned public projection; Phase 12 may declare a separate encrypted Worker secret name without exposing credential material or broadening browser database grants.');
