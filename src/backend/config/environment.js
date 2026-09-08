function boundedInteger(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function resolveEnvironment(source, runtime) {
  const explicit = source.RC_ENVIRONMENT || source.NODE_ENV;
  if (explicit) return String(explicit);
  return runtime === 'node-local' ? 'development' : 'unconfigured';
}

export function createBackendConfig(source = {}, { runtime = 'unknown' } = {}) {
  return Object.freeze({
    environment: resolveEnvironment(source, runtime),
    maxJsonBodyBytes: boundedInteger(source.RC_MAX_JSON_BODY_BYTES, 1024 * 1024, 16 * 1024, 4 * 1024 * 1024),
    serviceName: 'rc-it-services',
    apiPrefix: '/api/'
  });
}
