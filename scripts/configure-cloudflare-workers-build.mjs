import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generatedConfigDir = path.join(root, '.wrangler', 'deploy');
const generatedConfigFile = path.join(generatedConfigDir, 'config.json');
const generatedWorkerConfigFile = path.join(generatedConfigDir, 'worker-config.json');
const ADMIN_WORKERS = new Set(['rcitcs-admin-staging', 'rcitcs-admin-production']);

export const WORKERS_BUILD_CONFIG = Object.freeze({
  'rc-it-consulting-services': 'wrangler.jsonc',
  'rcitcs-admin-staging': 'wrangler.admin-staging.jsonc',
  'rcitcs-admin-production': 'wrangler.admin-production.jsonc',
  rcitcservices: 'cloudflare/legacy-rcitcservices/wrangler.jsonc'
});

export function resolveWorkersBuildConfig(workerName = '') {
  const normalized = String(workerName || '').trim();
  if (!normalized) return null;
  const configPath = WORKERS_BUILD_CONFIG[normalized];
  if (!configPath) {
    throw new Error(`Unsupported Cloudflare Workers Builds target: ${normalized}. Refusing to deploy with the wrong Wrangler configuration.`);
  }
  return configPath;
}

export function normalizeWorkersCommitSha(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  return /^[0-9a-f]{40}$/.test(normalized) ? normalized : null;
}

export function isCloudflareWorkersBuild(value = process.env.WORKERS_CI) {
  return String(value || '').trim() === '1';
}

export function withAdminDeploymentIdentity(workerName, config, commitSha) {
  const normalizedName = String(workerName || '').trim();
  const clone = structuredClone(config || {});
  if (!ADMIN_WORKERS.has(normalizedName)) return clone;

  const normalizedSha = normalizeWorkersCommitSha(commitSha);
  if (!normalizedSha) {
    throw new Error(`Cloudflare Workers Build for ${normalizedName} is missing a valid 40-character WORKERS_CI_COMMIT_SHA. Refusing an unidentifiable admin deployment.`);
  }

  clone.vars = {
    ...(clone.vars || {}),
    RC_ADMIN_DEPLOYMENT_SHA: normalizedSha
  };
  return clone;
}

function relativeFromGeneratedConfig(value = '') {
  const absolute = path.resolve(root, String(value));
  const relative = path.relative(generatedConfigDir, absolute).replaceAll(path.sep, '/');
  return relative.startsWith('.') ? relative : `./${relative}`;
}

async function buildDeploymentConfig(workerName, sourceConfigPath, commitSha, { mirrorSourceConfig = false } = {}) {
  if (!ADMIN_WORKERS.has(workerName)) {
    await rm(generatedWorkerConfigFile, { force: true });
    return path.join(root, sourceConfigPath);
  }

  const sourceConfigFile = path.join(root, sourceConfigPath);
  const raw = await readFile(sourceConfigFile, 'utf8');
  const sourceConfig = JSON.parse(raw);
  const deploymentConfig = withAdminDeploymentIdentity(workerName, sourceConfig, commitSha);
  const generatedConfig = structuredClone(deploymentConfig);

  if (generatedConfig.$schema) generatedConfig.$schema = relativeFromGeneratedConfig(generatedConfig.$schema);
  if (generatedConfig.main) generatedConfig.main = relativeFromGeneratedConfig(generatedConfig.main);

  await writeFile(generatedWorkerConfigFile, `${JSON.stringify(generatedConfig, null, 2)}\n`, 'utf8');

  // Cloudflare Workers Builds normally lets Wrangler discover
  // .wrangler/deploy/config.json. Some existing Worker projects may instead
  // use an explicit `wrangler deploy --config wrangler.admin-*.jsonc` deploy
  // command, which bypasses that redirect. During the ephemeral Cloudflare
  // checkout only, mirror the exact validated commit identity into the source
  // admin config as well so both deploy-command forms publish the same trusted
  // runtime variable. The tracked repository config remains SHA-free.
  if (mirrorSourceConfig) {
    await writeFile(sourceConfigFile, `${JSON.stringify(deploymentConfig, null, 2)}\n`, 'utf8');
  }

  return generatedWorkerConfigFile;
}

export async function configureWorkersBuild({
  workerName = process.env.WRANGLER_CI_OVERRIDE_NAME,
  commitSha = process.env.WORKERS_CI_COMMIT_SHA || process.env.GITHUB_SHA,
  workersCi = process.env.WORKERS_CI
} = {}) {
  const configPath = resolveWorkersBuildConfig(workerName);

  if (!configPath) {
    await rm(generatedConfigFile, { force: true });
    await rm(generatedWorkerConfigFile, { force: true });
    return null;
  }

  await mkdir(generatedConfigDir, { recursive: true });
  const deploymentConfigFile = await buildDeploymentConfig(workerName, configPath, commitSha, {
    mirrorSourceConfig: isCloudflareWorkersBuild(workersCi)
  });
  const relativeTarget = path.relative(generatedConfigDir, deploymentConfigFile).replaceAll(path.sep, '/');
  await writeFile(generatedConfigFile, `${JSON.stringify({ configPath: relativeTarget }, null, 2)}\n`, 'utf8');
  console.log(`Cloudflare Workers Builds target ${workerName} -> ${configPath}${ADMIN_WORKERS.has(workerName) ? ` at commit ${normalizeWorkersCommitSha(commitSha)}` : ''}`);
  return { workerName, configPath, generatedConfigFile, deploymentConfigFile };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await configureWorkersBuild();
}
