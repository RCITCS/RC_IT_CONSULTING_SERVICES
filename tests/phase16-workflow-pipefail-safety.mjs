import assert from "node:assert/strict";
import fs from "node:fs";

const liveCi = fs.readFileSync(new URL("../.github/workflows/cloudflare-deploy.yml", import.meta.url), "utf8");
const exactGate = fs.readFileSync(new URL("../.github/workflows/cloudflare-exact-deployment.yml", import.meta.url), "utf8");

for (const [label, workflow] of [["live CI", liveCi], ["exact deployment", exactGate]]) {
  assert.ok(!/tr -d ['"]\\r['"]\s*<[^\n]*\|\s*grep\s+-q/i.test(workflow), `${label} must not use pipefail-sensitive tr-to-grep header assertions`);
  assert.ok(!/curl[^\n]*\|\s*tr -d ['"]\\r['"]\s*\|\s*grep\s+-q/i.test(workflow), `${label} must not pipe curl/tr into grep -q under pipefail`);
}

assert.ok(!liveCi.includes("| head -n1"), "live CI must not use early-exit head pipelines under pipefail");

for (const fragment of [
  "grep -qi '^cache-control:.*no-store' /tmp/admin-root.headers",
  "grep -qi '^content-security-policy:' /tmp/admin-root.headers",
  "grep -qi '^cache-control:.*no-store' /tmp/admin-visual.headers",
  "grep -qi '^x-frame-options: *DENY' /tmp/admin-visual.headers",
  "curl -sSI \"${BASE}${app_asset}\" -o /tmp/app-asset.headers",
  "curl -sSI \"${BASE}/careers/job-opportunities\" -o /tmp/careers-alias.headers"
]) assert.ok(liveCi.includes(fragment), `live CI is missing robust header assertion contract: ${fragment}`);

for (const fragment of [
  "grep -qi '^x-rc-admin-edge-release: *phase12-job-authoring-v1' /tmp/admin.headers",
  "grep -qi '^cache-control:.*no-store' /tmp/admin.headers",
  "grep -qi '^x-robots-tag:.*noindex' /tmp/admin.headers"
]) assert.ok(exactGate.includes(fragment), `exact deployment gate is missing robust header assertion contract: ${fragment}`);

console.log("Phase 16 workflow pipefail/header assertion safety: PASS");
