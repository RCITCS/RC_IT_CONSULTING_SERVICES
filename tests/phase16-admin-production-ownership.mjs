import assert from "node:assert/strict";
import fs from "node:fs";

const entry = fs.readFileSync(new URL("../cloudflare/admin-production/index.js", import.meta.url), "utf8");
const config = fs.readFileSync(new URL("../cloudflare/admin-production/wrangler.jsonc", import.meta.url), "utf8");
const rootConfig = fs.readFileSync(new URL("../wrangler.admin-production.jsonc", import.meta.url), "utf8");
const adminWorker = fs.readFileSync(new URL("../worker/admin-only.js", import.meta.url), "utf8");

for (const fragment of [
  "import adminWorker from '../../worker/admin-only.js';",
  "const ADMIN_BUILD_SURFACE = 'phase16-security-closure-v1';",
  "headers.set('x-rc-admin-build-surface', ADMIN_BUILD_SURFACE);",
  "return adaptProductionAdminResponse(response);"
]) assert.ok(entry.includes(fragment), `production admin build root lost ownership contract: ${fragment}`);

for (const source of [config, rootConfig]) {
  assert.ok(source.includes('"name": "rcitcs-admin-production"'), "production admin Wrangler name must remain rcitcs-admin-production");
  assert.ok(source.includes('"workers_dev": false'), "production admin Worker must remain custom-domain only");
  assert.ok(source.includes('"pattern": "admin.rcitcs.com"'), "production admin Worker must retain admin.rcitcs.com custom-domain ownership");
  assert.ok(source.includes('"custom_domain": true'), "production admin route must remain a Cloudflare custom domain");
}

assert.ok(adminWorker.includes("export const ADMIN_EDGE_RELEASE = 'phase12-job-authoring-v1';"), "dedicated admin edge release marker changed unexpectedly");
assert.ok(adminWorker.includes("headers.set('x-rc-admin-edge-release', ADMIN_EDGE_RELEASE);"), "dedicated admin edge release header must remain authoritative");

console.log("Phase 16 dedicated production-admin Cloudflare ownership contract: PASS");
