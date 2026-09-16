import assert from "node:assert/strict";
import fs from "node:fs";

const stagingConfig = JSON.parse(fs.readFileSync(new URL("../wrangler.admin-staging.jsonc", import.meta.url), "utf8"));
const productionConfig = JSON.parse(fs.readFileSync(new URL("../wrangler.admin-production.jsonc", import.meta.url), "utf8"));
const publicConfig = JSON.parse(fs.readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const legacyConfig = JSON.parse(fs.readFileSync(new URL("../cloudflare/legacy-rcitcservices/wrangler.jsonc", import.meta.url), "utf8"));
const buildSelector = fs.readFileSync(new URL("../scripts/configure-cloudflare-workers-build.mjs", import.meta.url), "utf8");
const adminWorker = fs.readFileSync(new URL("../worker/admin-only.js", import.meta.url), "utf8");
const productionAdminWorker = fs.readFileSync(new URL("../worker/admin-production.js", import.meta.url), "utf8");

assert.equal(stagingConfig.name, "rcitcs-admin-staging");
assert.equal(stagingConfig.main, "./worker/admin-only.js");
assert.equal(stagingConfig.workers_dev, false);
assert.equal(stagingConfig.keep_vars, true);
assert.equal(stagingConfig.vars?.RC_ADMIN_BUILD_SURFACE, "phase16-security-closure-v1");
assert.equal(stagingConfig.vars?.RC_ADMIN_HTML_MEDIA_FIX, "phase16-html-content-type-v1");
assert.equal(stagingConfig.vars?.RC_ADMIN_ENVIRONMENT, "staging");
assert.equal(stagingConfig.vars?.RC_ADMIN_STAGING_MODE, "unavailable");
assert.deepEqual(
  stagingConfig.routes?.map((route) => [route.pattern, route.custom_domain]),
  [["admin-staging.rcitcs.com", true]],
  "after Phase 17.7 the staging Worker must own only the staging hostname"
);

assert.ok(
  buildSelector.includes("'rcitcs-admin-staging': 'wrangler.admin-staging.jsonc'"),
  "Cloudflare Workers Builds must keep selecting the staging Wrangler config by staging Worker name"
);
assert.ok(
  buildSelector.includes("'rcitcs-admin-production': 'wrangler.admin-production.jsonc'"),
  "Cloudflare Workers Builds must keep a distinct canonical production-admin config mapping"
);

assert.equal(publicConfig.name, "rc-it-consulting-services");
assert.deepEqual(
  publicConfig.routes?.map((route) => [route.pattern, route.custom_domain]),
  [["rcitcs.com", true], ["www.rcitcs.com", true]],
  "the public Worker may own only the approved public apex/www pair"
);
assert.equal(
  publicConfig.routes?.some((route) => /^admin(?:-staging)?\.rcitcs\.com/.test(String(route.pattern || ""))),
  false,
  "Phase 16 admin isolation must survive Phase 17 ownership convergence"
);

assert.equal(legacyConfig.name, "rcitcservices");
assert.equal(Object.hasOwn(legacyConfig, "routes"), false, "the old-account legacy Worker must not claim company domains");

assert.equal(productionConfig.name, "rcitcs-admin-production");
assert.equal(productionConfig.main, "./worker/admin-production.js");
assert.equal(productionConfig.workers_dev, false);
assert.equal(
  Object.hasOwn(productionConfig, "keep_vars"),
  false,
  "production admin Wrangler config must remain authoritative for non-secret runtime variables"
);
assert.equal(productionConfig.vars?.RC_ADMIN_ENVIRONMENT, "production");
assert.deepEqual(
  productionConfig.routes?.map((route) => [route.pattern, route.custom_domain]),
  [["admin.rcitcs.com", true]],
  "canonical production admin Worker must own only admin.rcitcs.com"
);
assert.ok(
  productionAdminWorker.includes("return adminWorker.fetch(request, env, ctx)"),
  "production wrapper must preserve the Phase 16 hardened admin runtime as the canonical implementation"
);
assert.ok(
  productionAdminWorker.includes("productionAdminLegacyRedirect(request)"),
  "production wrapper may add only the Phase 17 canonical legacy-navigation boundary before the Phase 16 runtime"
);

for (const fragment of [
  "export const ADMIN_EDGE_RELEASE = 'phase12-job-authoring-v1';",
  "export const ADMIN_BUILD_SURFACE = 'phase16-security-closure-v1';",
  "export const ADMIN_HTML_MEDIA_FIX = 'phase16-html-content-type-v1';",
  "headers.set('x-rc-admin-edge-release', ADMIN_EDGE_RELEASE);",
  "headers.set('x-rc-admin-build-surface', ADMIN_BUILD_SURFACE);",
  "headers.set('x-rc-admin-html-media-fix', ADMIN_HTML_MEDIA_FIX);",
  "headers.set('x-rc-admin-environment', environment);",
  "return markAdminBuildSurface(response, env);"
]) assert.ok(adminWorker.includes(fragment), `admin runtime lost Phase 16/17 edge ownership contract: ${fragment}`);

console.log("Phase 16 admin security/media-type contract preserved through Phase 17.7 ownership convergence and production legacy canonicalization: PASS");
