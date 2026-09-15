import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

assert.equal(pkg.dependencies?.bootstrap, "5.3.8", "Bootstrap must remain exact-pinned to the reviewed current release");
assert.equal(pkg.devDependencies?.esbuild, "0.28.2", "esbuild must remain exact-pinned above the 0.28.1 security floor");
assert.ok(!String(pkg.dependencies?.bootstrap).match(/^[~^]/), "runtime dependencies must not float by semver range");
assert.ok(!String(pkg.devDependencies?.esbuild).match(/^[~^]/), "build dependencies must not float by semver range");

const [esMajor, esMinor, esPatch] = String(pkg.devDependencies.esbuild).split(".").map(Number);
assert.ok(esMajor > 0 || esMinor > 28 || (esMinor === 28 && esPatch >= 1), "esbuild must not regress below patched 0.28.1");

const workflowsDir = path.join(root, ".github/workflows");
const workflows = fs.readdirSync(workflowsDir).filter((name) => /\.ya?ml$/i.test(name));
assert.ok(workflows.length >= 5, "expected CI/deployment workflow inventory");

for (const name of workflows) {
  const source = fs.readFileSync(path.join(workflowsDir, name), "utf8");
  assert.ok(!/^\s*pull_request_target\s*:/m.test(source), `${name} must not execute repository code through pull_request_target`);
  assert.ok(!/curl\s+[^\n|]+\|\s*(?:sh|bash)\b/i.test(source), `${name} must not pipe downloaded scripts directly to a shell`);
  assert.ok(!/wget\s+[^\n|]+\|\s*(?:sh|bash)\b/i.test(source), `${name} must not pipe downloaded scripts directly to a shell`);
}

const packageText = fs.readFileSync(path.join(root, "package.json"), "utf8");
assert.ok(!packageText.includes('"esbuild": "^0.25.'), "known vulnerable esbuild 0.25 range must stay removed");

console.log("Phase 16.11 dependency and CI supply-chain review: PASS");
