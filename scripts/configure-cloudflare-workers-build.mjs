import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generatedConfigDir = path.join(root, '.wrangler', 'deploy');
const generatedConfigFile = path.join(generatedConfigDir, 'config.json');

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

export async function configureWorkersBuild({ workerName = process.env.WRANGLER_CI_OVERRIDE_NAME } = {}) {
  const configPath = resolveWorkersBuildConfig(workerName);

  if (!configPath) {
    await rm(generatedConfigFile, { force: true });
    return null;
  }

  await mkdir(generatedConfigDir, { recursive: true });
  const absoluteTarget = path.join(root, configPath);
  const relativeTarget = path.relative(generatedConfigDir, absoluteTarget).replaceAll(path.sep, '/');
  await writeFile(generatedConfigFile, `${JSON.stringify({ configPath: relativeTarget }, null, 2)}\n`, 'utf8');
  console.log(`Cloudflare Workers Builds target ${workerName} -> ${configPath}`);
  return { workerName, configPath, generatedConfigFile };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await configureWorkersBuild();
}
