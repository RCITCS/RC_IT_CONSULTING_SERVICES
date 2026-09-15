import assert from "node:assert/strict";
import fs from "node:fs";

const activeConfig = JSON.parse(fs.readFileSync(new URL("../wrangler.admin-staging.jsonc", import.meta.url), "utf8"));
const canonicalConfig = JSON.parse(fs.readFileSync(new URL("../wrangler.admin-production.jsonc", import.meta.url), "utf8"));
const publicConfig = JSON.parse(fs.readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const legacyConfig = JSON.parse(fs.readFileSync(new URL("../cloudflare/legacy-rcitcservices/wrangler.jsonc", import.meta.url), "utf8"));
const buildSelector = fs.readFileSync(new URL("../scripts/configure-cloudflare-workers-build.mjs", import.meta.url), "utf8");
const adminWorker = fs.readFileSync(new URL("../worker/admin-only.js", import.meta.url), "utf8");

assert.equal(activeConfig.name, "rcitcs-admin-staging", "the connected company-account admin Worker remains the active deployment target");
assert.equal(activeConfig.main, "./worker/admin-only.js", "the active admin Worker must serve the hardened admin-only runtime");
assert.equal(activeConfig.workers_dev, false, "the active admin Worker must remain Custom-Domain only");
assert.equal(activeConfig.keep_vars, true, "the active admin Worker must preserve managed runtime bindings");
assert.equal(activeConfig.vars?.RC_ADMIN_BUILD_SURFACE, "phase16-security-closure-v1", "the active connected admin build must carry the Phase 16 deployment marker");
assert.equal(activeConfig.vars?.RC_ADMIN_HTML_MEDIA_FIX, "phase16-html-content-type-v1", "the connected admin Worker must carry the media-type repair deployment marker");
assert.deepEqual(
  activeConfig.routes?.map((route) => [route.pattern, route.custom_domain]),
  [["admin.rcitcs.com", true], ["admin-staging.rcitcs.com", true]],
  "the connected company-account admin Worker must own production and staging admin Custom Domains"
);

assert.ok(
  buildSelector.includes("'rcitcs-admin-staging': 'wrangler.admin-staging.jsonc'"),
  "Cloudflare Workers Builds must select the active company admin Wrangler config by connected Worker name"
);

assert.equal(publicConfig.name, "rc-it-consulting-services");
assert.deepEqual(
  publicConfig.routes?.map((route) => [route.pattern, route.custom_domain]),
  [["rcitcs.com", true]],
  "the public Worker must own only the public apex and must not reconcile admin-domain ownership"
);

assert.equal(legacyConfig.name, "rcitcservices");
assert.equal(Object.hasOwn(legacyConfig, "routes"), false, "the old-account legacy Worker must not claim company domains");

assert.equal(canonicalConfig.name, "rcitcs-admin-production");
assert.equal(canonicalConfig.main, "./worker/admin-only.js");
assert.ok(canonicalConfig.routes?.some((route) => route.pattern === "admin.rcitcs.com" && route.custom_domain === true), "the canonical future production-admin config must remain source-controlled without replacing the connected company admin target during Phase 16 closure");

for (const fragment of [
  "export const ADMIN_EDGE_RELEASE = 'phase12-job-authoring-v1';",
  "export const ADMIN_BUILD_SURFACE = 'phase16-security-closure-v1';",
  "export const ADMIN_HTML_MEDIA_FIX = 'phase16-html-content-type-v1';",
  "headers.set('x-rc-admin-edge-release', ADMIN_EDGE_RELEASE);",
  "headers.set('x-rc-admin-build-surface', ADMIN_BUILD_SURFACE);",
  "headers.set('x-rc-admin-html-media-fix', ADMIN_HTML_MEDIA_FIX);",
  "'x-rc-admin-build-surface': ADMIN_BUILD_SURFACE",
  "'x-rc-admin-html-media-fix': ADMIN_HTML_MEDIA_FIX",
  "return markAdminBuildSurface(response);"
]) assert.ok(adminWorker.includes(fragment), `active admin runtime lost Phase 16 edge ownership/media-type contract: ${fragment}`);

console.log("Phase 16 active company-admin Cloudflare ownership/media-type contract: PASS");
