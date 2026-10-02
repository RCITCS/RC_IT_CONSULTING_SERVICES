import assert from "node:assert/strict";
import fs from "node:fs";

const seo = fs.readFileSync("src/frontend/seo/seo-model.js","utf8");
const sitemap = fs.readFileSync("src/backend/runtime/public-sitemap.js","utf8");
const jobs = fs.readFileSync("src/backend/runtime/job-posting.js","utf8");
const careers = fs.readFileSync("src/backend/runtime/public-careers.js","utf8");

assert.match(seo,/Disallow: \/api\//);
assert.match(seo,/Disallow: \/admin\//);
assert.match(seo,/Sitemap: \$\{SITE_ORIGIN\}\/sitemap\.xml/);
assert.match(seo,/kind: 'job-application'/);
assert.match(seo,/index: false/);
assert.match(seo,/JobPosting/);

assert.match(sitemap,/appendJobUrls/);
assert.match(sitemap,/\/careers\/jobs\/\$\{slug\}/);
assert.match(sitemap,/preview deployment searchable/);
assert.doesNotMatch(sitemap,/\/apply/);

for (const marker of ["'@type': 'JobPosting'","directApply: true","hiringOrganization","datePosted","jobLocation","identifier"]) {
  assert.ok(jobs.includes(marker), `runtime JobPosting marker missing: ${marker}`);
}
assert.match(careers,/name="robots" content="noindex,nofollow"/);
assert.match(careers,/appendRuntimeJobPosting/);

console.log("Phase 20.15 SEO/search-index source certification: PASS");
