import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => existsSync(path.join(root, relativePath));

const PHASE19_BASELINE = '76f99be9938b0eedce92041be1b265279fe955b2';

const requiredPaths = [
  '.github/workflows/cloudflare-deploy.yml',
  '.github/workflows/cloudflare-exact-deployment.yml',
  '.github/workflows/phase18-responsive-qa.yml',
  '.github/workflows/phase19-quality.yml',
  '.github/workflows/phase20-release-certification.yml',
  'docs/PHASE_20_1_5_RELEASE_CERTIFICATION.md',
  'scripts/build.mjs',
  'scripts/check-release-artifacts.mjs',
  'wrangler.jsonc',
  'wrangler.admin-production.jsonc',
  'wrangler.admin-staging.jsonc'
];

for (const requiredPath of requiredPaths) {
  assert.ok(exists(requiredPath), `Missing Phase 20 release dependency: ${requiredPath}`);
}

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root })
  .toString('utf8')
  .split('\0')
  .filter(Boolean);

const generatedPrefixes = [
  'dist/',
  'node_modules/',
  '.lighthouseci/',
  'playwright-report/',
  'playwright-report-phase19/',
  'test-results/',
  'coverage/'
];

const generatedTracked = tracked.filter((file) => generatedPrefixes.some((prefix) => file.startsWith(prefix)));
assert.deepEqual(generatedTracked, [], `Generated release/test output must not be tracked: ${generatedTracked.join(', ')}`);

const trackedEnvSecrets = tracked.filter((file) => {
  const name = path.basename(file);
  if (!name.startsWith('.env')) return false;
  return !['.env.example', '.env.sample', '.env.template'].includes(name);
});
assert.deepEqual(trackedEnvSecrets, [], `Tracked environment secret files are forbidden: ${trackedEnvSecrets.join(', ')}`);

const desktopDebris = tracked.filter((file) => path.basename(file) === '.DS_Store' || path.basename(file) === 'Thumbs.db');
assert.deepEqual(desktopDebris, [], `Desktop metadata must not be tracked: ${desktopDebris.join(', ')}`);

const temporaryWorkflows = tracked.filter((file) =>
  file.startsWith('.github/workflows/') && /(diagnostic|temporary|debug|scratch)/i.test(path.basename(file))
);
assert.deepEqual(temporaryWorkflows, [], `Temporary/debug workflows are not release artifacts: ${temporaryWorkflows.join(', ')}`);

assert.ok(
  !tracked.includes('.github/workflows/phase17-live-admin-diagnostics.yml'),
  'The temporary Phase 17 live-admin diagnostic workflow must not return to the release branch.'
);

const textExtensions = new Set(['.js', '.mjs', '.ts', '.css', '.html', '.json', '.jsonc', '.yml', '.yaml', '.sql', '.toml']);
const conflictFiles = [];
const privateKeyFiles = [];
for (const file of tracked) {
  const extension = path.extname(file);
  if (!textExtensions.has(extension)) continue;
  const fullPath = path.join(root, file);
  if (statSync(fullPath).size > 2_000_000) continue;
  const content = readFileSync(fullPath, 'utf8');
  if (/^<<<<<<< |^=======\s*$|^>>>>>>> /m.test(content)) conflictFiles.push(file);
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)) privateKeyFiles.push(file);
}
assert.deepEqual(conflictFiles, [], `Unresolved merge-conflict markers found in: ${conflictFiles.join(', ')}`);
assert.deepEqual(privateKeyFiles, [], `Tracked private key material found in: ${privateKeyFiles.join(', ')}`);

for (const configPath of ['wrangler.jsonc', 'wrangler.admin-production.jsonc', 'wrangler.admin-staging.jsonc']) {
  const content = read(configPath);
  assert.match(content, /"workers_dev"\s*:\s*false/, `${configPath} must keep workers_dev disabled.`);
  assert.match(content, /"preview_urls"\s*:\s*false/, `${configPath} must keep preview URLs disabled.`);
}

const exactDeploymentWorkflow = read('.github/workflows/cloudflare-exact-deployment.yml');
assert.ok(exactDeploymentWorkflow.includes('EXPECTED_SHA: ${{ github.sha }}'), 'Exact deployment gate must bind production to github.sha.');
assert.ok(exactDeploymentWorkflow.includes('rc-deployment-sha'), 'Exact deployment gate must verify the deployment-SHA marker.');

const buildScript = read('scripts/build.mjs');
assert.ok(
  buildScript.includes("process.env.WORKERS_CI_COMMIT_SHA || process.env.GITHUB_SHA || 'development'"),
  'Production build must derive the deployment marker from an exact CI commit SHA.'
);
assert.ok(buildScript.includes('meta name="rc-deployment-sha"'), 'Production build must emit the deployment-SHA meta marker.');

const phase20Doc = read('docs/PHASE_20_1_5_RELEASE_CERTIFICATION.md');
assert.ok(phase20Doc.includes(PHASE19_BASELINE), 'Phase 20 documentation must preserve the certified Phase 19 release baseline.');
assert.ok(phase20Doc.includes('PR #87'), 'Phase 20 hygiene evidence must record closure of temporary PR #87.');
assert.ok(phase20Doc.includes('PR #61'), 'Phase 20 hygiene evidence must record closure of obsolete PR #61.');

const phase20Workflow = read('.github/workflows/phase20-release-certification.yml');
for (const requiredJob of ['release-baseline:', 'repository-hygiene:', 'ci-cd-certification:', 'artifact-integrity:', 'exact-production:']) {
  assert.ok(phase20Workflow.includes(requiredJob), `Phase 20 workflow is missing job ${requiredJob}`);
}

console.log(`Phase 20 release hygiene certification passed for ${tracked.length} tracked files.`);