import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const migrationDir = path.join(root, "supabase", "migrations");
const files = fs.readdirSync(migrationDir)
  .filter((name) => /^\d{14}_.+\.sql$/.test(name))
  .sort();

assert.ok(files.length > 0, "migration directory must contain timestamped SQL migrations");

const versions = new Map();
const exactContent = new Map();

for (const name of files) {
  const version = name.slice(0, 14);
  assert.ok(!versions.has(version), `duplicate migration version prefix: ${version}`);
  versions.set(version, name);

  const sql = fs.readFileSync(path.join(migrationDir, name), "utf8");
  const hash = crypto.createHash("sha256").update(sql).digest("hex");
  const group = exactContent.get(hash) ?? [];
  group.push({ name, sql });
  exactContent.set(hash, group);

  const executable = sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  assert.ok(!/\bdrop\s+table\b/i.test(executable), `${name} contains destructive DROP TABLE`);
  assert.ok(!/\btruncate(?:\s+table)?\b/i.test(executable), `${name} contains destructive TRUNCATE`);
  assert.ok(!/\bdrop\s+schema\b/i.test(executable), `${name} contains destructive DROP SCHEMA`);
}

for (const group of exactContent.values()) {
  if (group.length < 2) continue;
  assert.ok(
    group.every(({ sql }) => sql.includes("intentionally no schema change")),
    `duplicate migration content detected outside intentional no-op markers: ${group.map(({ name }) => name).join(", ")}`
  );
}

const sourceContract = fs.readFileSync(
  path.join(migrationDir, "20260910203000_phase_12_candidate_application_contract.sql"),
  "utf8"
);
assert.match(
  sourceContract,
  /application_documents_sha256_check[\s\S]*not valid/i,
  "historical SHA-256 constraint must remain traceable as the original NOT VALID boundary"
);

const closureName = "20260920014500_phase_20_12_application_document_hash_validation.sql";
const closure = fs.readFileSync(path.join(migrationDir, closureName), "utf8");

for (const fragment of [
  "application_documents_sha256_check",
  "where sha256 is null",
  "sha256 !~ '^[0-9a-f]{64}$'",
  "validate constraint application_documents_sha256_check",
  "notify pgrst, 'reload schema'"
]) {
  assert.ok(closure.toLowerCase().includes(fragment.toLowerCase()), `Phase 20.12 migration missing: ${fragment}`);
}

const closureExecutable = closure
  .replace(/--.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

for (const forbidden of [
  /\binsert\s+into\b/i,
  /\bupdate\s+public\./i,
  /\bdelete\s+from\b/i,
  /\bdrop\s+/i,
  /\btruncate\b/i
]) {
  assert.ok(!forbidden.test(closureExecutable), `Phase 20.12 validation migration must be data-preserving: ${forbidden}`);
}

console.log("Phase 20.12 database / persistence / migration / RLS source certification: PASS");
