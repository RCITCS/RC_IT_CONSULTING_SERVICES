import assert from 'node:assert/strict';
import {
  adminDeploymentCommand,
  adminDeploymentEnvironment,
  shouldDeployAdminFromWorkersBuild
} from '../scripts/deploy-admin-from-workers-build.mjs';

const publicMain = {
  WORKERS_CI: '1',
  WORKERS_CI_BRANCH: 'main',
  WRANGLER_CI_OVERRIDE_NAME: 'rc-it-consulting-services',
  WORKERS_CI_COMMIT_SHA: 'abc123',
  CLOUDFLARE_API_TOKEN: 'masked-build-token'
};

assert.equal(shouldDeployAdminFromWorkersBuild(publicMain), true, 'Company public Worker main builds must deploy the production admin Worker.');
assert.equal(shouldDeployAdminFromWorkersBuild({ ...publicMain, WORKERS_CI_BRANCH: 'feature/test' }), false, 'Preview branches must never deploy production admin.');
assert.equal(shouldDeployAdminFromWorkersBuild({ ...publicMain, WRANGLER_CI_OVERRIDE_NAME: 'rcitcs-admin-staging' }), false, 'Staging Workers Builds must never deploy production admin.');
assert.equal(shouldDeployAdminFromWorkersBuild({ ...publicMain, WORKERS_CI: undefined }), false, 'Ordinary GitHub/local builds must never deploy production admin.');

const childEnv = adminDeploymentEnvironment(publicMain);
assert.equal(childEnv.CLOUDFLARE_ACCOUNT_ID, '3fdd024f6fbc25c03ed4481352576540');
assert.equal(childEnv.CLOUDFLARE_API_TOKEN, 'masked-build-token', 'The existing Workers Builds credential must be inherited without being printed or copied into source.');
assert.equal(Object.hasOwn(childEnv, 'WRANGLER_CI_OVERRIDE_NAME'), false, 'Nested Wrangler must not inherit the connected public Worker name override.');

const deploy = adminDeploymentCommand();
assert.equal(deploy.command, 'npx');
assert.deepEqual(deploy.args, ['--yes', 'wrangler@4.131.0', 'deploy', '--config', 'wrangler.admin-production.jsonc']);

console.log('PASS: company public Workers Build is the only context allowed to orchestrate the isolated production-admin deployment, using the existing Cloudflare credential without exposing it.');
