import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const directory = path.dirname(new URL(import.meta.url).pathname);
const self = path.basename(new URL(import.meta.url).pathname);
const tests = fs.readdirSync(directory)
  .filter((name) => name.startsWith("phase16-") && name.endsWith(".mjs") && name !== self)
  .sort();

if (!tests.length) throw new Error("No Phase 16 regression gates found");

for (const test of tests) {
  await import(`${pathToFileURL(path.join(directory, test)).href}?phase16=${Date.now()}`);
}

console.log(`Phase 16 aggregate gate: PASS (${tests.length} modules)`);
