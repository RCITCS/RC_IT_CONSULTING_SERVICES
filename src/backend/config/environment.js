function boundedInteger(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

export function createBackendConfig(source = {}) {
  return Object.freeze({
    environment: String(source.RC_ENVIRONMENT || source.NODE_ENV || 'development'),
    maxJsonBodyBytes: boundedInteger(source.RC_MAX_JSON_BODY_BYTES, 1024 * 1024, 16 * 1024, 4 * 1024 * 1024),
    serviceName: 'rc-it-services',
    apiPrefix: '/api/'
  });
}
