const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';
export const RCITCS_CLOUDFLARE_ZONE_ID = 'cf815244b9dbd51a490747f597867c68';
export const RCITCS_ADMIN_ROUTE_CONVERGENCE_TARGET = 'rcitcs-admin-production';

export const LEGACY_ADMIN_WORKER_ROUTES = Object.freeze([
  Object.freeze({
    pattern: 'admin.rcitcs.com/*',
    expectedScript: 'rc-it-consulting-services'
  }),
  Object.freeze({
    pattern: 'admin-staging.rcitcs.com/*',
    expectedScript: 'rcitcs-admin-staging'
  })
]);

export function shouldConvergeLegacyAdminRoutes(env = process.env) {
  return env.WORKERS_CI === '1'
    && env.WORKERS_CI_BRANCH === 'main'
    && env.WRANGLER_CI_OVERRIDE_NAME === RCITCS_ADMIN_ROUTE_CONVERGENCE_TARGET;
}

function authHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    accept: 'application/json'
  };
}

async function readCloudflareJson(response, operation) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`${operation} returned non-JSON HTTP ${response.status}.`);
  }

  if (!response.ok || payload?.success !== true) {
    const errors = Array.isArray(payload?.errors)
      ? payload.errors.map((item) => item?.message || item?.code).filter(Boolean).join('; ')
      : '';
    throw new Error(`${operation} failed with HTTP ${response.status}${errors ? `: ${errors}` : ''}.`);
  }

  return payload;
}

export async function listWorkerRoutes({
  token,
  zoneId = RCITCS_CLOUDFLARE_ZONE_ID,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN is required for route convergence.');
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required for route convergence.');

  const response = await fetchImpl(`${CLOUDFLARE_API_BASE}/zones/${zoneId}/workers/routes`, {
    method: 'GET',
    headers: authHeaders(token)
  });
  const payload = await readCloudflareJson(response, 'List Cloudflare Worker Routes');
  if (!Array.isArray(payload.result)) throw new Error('Cloudflare Worker Routes list did not return an array.');
  return payload.result;
}

function validateLegacyRouteOwnership(routes) {
  const matches = [];

  for (const expected of LEGACY_ADMIN_WORKER_ROUTES) {
    const exact = routes.filter((route) => route?.pattern === expected.pattern);
    if (exact.length > 1) {
      throw new Error(`Refusing route convergence: duplicate Worker Routes exist for ${expected.pattern}.`);
    }
    if (exact.length === 0) continue;

    const [route] = exact;
    if (route?.script !== expected.expectedScript) {
      throw new Error(
        `Refusing route convergence: ${expected.pattern} is owned by ${route?.script || '<no script>'}, expected ${expected.expectedScript}.`
      );
    }
    if (!route?.id) throw new Error(`Refusing route convergence: ${expected.pattern} has no route id.`);
    matches.push({ ...expected, id: route.id });
  }

  return matches;
}

export async function convergeLegacyAdminWorkerRoutes({
  env = process.env,
  fetchImpl = globalThis.fetch,
  zoneId = RCITCS_CLOUDFLARE_ZONE_ID
} = {}) {
  if (!shouldConvergeLegacyAdminRoutes(env)) {
    return { skipped: true, deleted: [] };
  }

  const token = env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    throw new Error('Production admin route convergence requires CLOUDFLARE_API_TOKEN from Cloudflare Workers Builds.');
  }

  const routes = await listWorkerRoutes({ token, zoneId, fetchImpl });
  const matches = validateLegacyRouteOwnership(routes);

  for (const route of matches) {
    const response = await fetchImpl(`${CLOUDFLARE_API_BASE}/zones/${zoneId}/workers/routes/${route.id}`, {
      method: 'DELETE',
      headers: authHeaders(token)
    });
    await readCloudflareJson(response, `Delete legacy Worker Route ${route.pattern}`);
    console.log(`Deleted legacy Worker Route ${route.pattern} from ${route.expectedScript}.`);
  }

  const remaining = await listWorkerRoutes({ token, zoneId, fetchImpl });
  const unresolved = LEGACY_ADMIN_WORKER_ROUTES.filter((expected) =>
    remaining.some((route) => route?.pattern === expected.pattern)
  );
  if (unresolved.length) {
    throw new Error(`Legacy Worker Routes remain after convergence: ${unresolved.map((item) => item.pattern).join(', ')}.`);
  }

  console.log(
    matches.length
      ? `Cloudflare route convergence complete: removed ${matches.length} audited legacy admin route(s).`
      : 'Cloudflare route convergence already complete: no audited legacy admin routes remain.'
  );

  return { skipped: false, deleted: matches.map((route) => route.pattern) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await convergeLegacyAdminWorkerRoutes();
}
