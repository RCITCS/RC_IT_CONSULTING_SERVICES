import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const COMPANY_ACCOUNT_ID = '3fdd024f6fbc25c03ed4481352576540';
const PUBLIC_WORKER_NAME = 'rc-it-consulting-services';
const ADMIN_CONFIG = 'wrangler.admin-production.jsonc';

export function shouldDeployAdminFromWorkersBuild(env = process.env) {
  return env.WORKERS_CI === '1'
    && env.WORKERS_CI_BRANCH === 'main'
    && env.WRANGLER_CI_OVERRIDE_NAME === PUBLIC_WORKER_NAME;
}

export function adminDeploymentEnvironment(env = process.env) {
  const childEnv = {
    ...env,
    CLOUDFLARE_ACCOUNT_ID: COMPANY_ACCOUNT_ID
  };

  // Cloudflare Workers Builds pins the connected Worker by injecting this value.
  // The nested deployment intentionally targets the separate admin Worker instead.
  delete childEnv.WRANGLER_CI_OVERRIDE_NAME;
  return childEnv;
}

export function adminDeploymentCommand() {
  return {
    command: 'npx',
    args: ['--yes', 'wrangler@4.131.0', 'deploy', '--config', ADMIN_CONFIG]
  };
}

export function deployAdminFromWorkersBuild(env = process.env) {
  if (!shouldDeployAdminFromWorkersBuild(env)) {
    console.log('Admin production deploy skipped: this is not the company public Worker main build.');
    return { skipped: true, status: 0 };
  }

  const { command, args } = adminDeploymentCommand();
  console.log(`Deploying rcitcs-admin-production from ${env.WORKERS_CI_COMMIT_SHA || 'current commit'} using the existing Cloudflare Workers Builds credential.`);

  const result = spawnSync(command, args, {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: adminDeploymentEnvironment(env),
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`rcitcs-admin-production deployment failed with exit code ${result.status ?? 'unknown'}.`);
  }

  console.log('rcitcs-admin-production deployment completed from the company Workers Build.');
  return { skipped: false, status: 0 };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL(`file://${process.argv[1]}`))) {
  try {
    deployAdminFromWorkersBuild();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
