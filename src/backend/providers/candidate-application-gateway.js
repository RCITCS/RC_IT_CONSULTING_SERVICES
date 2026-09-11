import { createPersistenceConfig } from '../config/persistence.js';
import { BackendError, providerUnavailable } from '../core/errors.js';

const ALLOWED_PUBLIC_ORIGINS = new Set([
  'https://rcitcservices.frsmkgit.workers.dev',
  'https://rc-it-services.vercel.app',
  'https://www.rcitcs.com',
  'https://rcitcs.com'
]);

function headerValue(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') return String(headers.get(name) || '');
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  const value = entry?.[1];
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

function normalizedOrigin(value) {
  try {
    const url = new URL(String(value || ''));
    return url.origin;
  } catch {
    return '';
  }
}

function trustedClientIp(runtime, headers) {
  if (runtime === 'cloudflare-workers') {
    return headerValue(headers, 'cf-connecting-ip').trim();
  }
  if (runtime === 'vercel') {
    // Vercel overwrites x-forwarded-for at its ingress to prevent client spoofing.
    return headerValue(headers, 'x-vercel-forwarded-for').split(',')[0].trim()
      || headerValue(headers, 'x-forwarded-for').split(',')[0].trim()
      || headerValue(headers, 'x-real-ip').trim();
  }
  return '';
}

function proxyName(runtime) {
  if (runtime === 'cloudflare-workers') return 'cloudflare';
  if (runtime === 'vercel') return 'vercel';
  return '';
}

function publicOrigin(runtime, headers) {
  const origin = normalizedOrigin(headerValue(headers, 'origin'));
  if (origin && ALLOWED_PUBLIC_ORIGINS.has(origin)) return origin;

  // Vercel/Cloudflare browser POSTs are expected to carry Origin. Do not derive a
  // trusted application origin from Host/X-Forwarded-Host because those values are
  // easier to misconfigure or spoof outside the managed ingress.
  if (runtime === 'node-local') {
    const local = normalizedOrigin(origin);
    if (local && /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(local)) return local;
  }
  return '';
}

function forwardedHeaders(response) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-robots-tag': 'noindex, nofollow'
  };
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) headers['retry-after'] = retryAfter;
  return headers;
}

export function createCandidateApplicationGateway({ env = {}, runtime = 'unknown', fetchImpl = globalThis.fetch } = {}) {
  const persistence = createPersistenceConfig(env);
  const proxy = proxyName(runtime);
  const endpoint = persistence.url ? `${persistence.url}/functions/v1/candidate-applications` : '';

  return Object.freeze({
    kind: 'candidate-application-gateway',
    configured: Boolean(endpoint && persistence.secretKey && proxy),
    async forward({ body, headers, requestId } = {}) {
      if (!endpoint || !persistence.secretKey || !proxy) {
        throw providerUnavailable('candidate_application', 'Candidate application intake is not configured for this runtime.');
      }

      const origin = publicOrigin(runtime, headers);
      const clientIp = trustedClientIp(runtime, headers);
      if (!origin || !clientIp || clientIp.length > 64) {
        throw new BackendError({
          code: 'REQUEST_REJECTED',
          message: 'The candidate application request could not be verified.',
          status: 403
        });
      }

      let response;
      try {
        response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            apikey: persistence.secretKey,
            authorization: `Bearer ${persistence.secretKey}`,
            'x-rcitcs-application-proxy': proxy,
            'x-rcitcs-original-origin': origin,
            'x-rcitcs-client-ip': clientIp,
            ...(requestId ? { 'x-request-id': String(requestId).slice(0, 128) } : {})
          },
          body: JSON.stringify(body || {})
        });
      } catch (cause) {
        throw new BackendError({
          code: 'APPLICATION_SERVICE_UNAVAILABLE',
          message: 'Candidate application service is temporarily unavailable.',
          status: 503,
          cause
        });
      }

      let payload;
      try {
        payload = await response.json();
      } catch (cause) {
        throw new BackendError({
          code: 'APPLICATION_SERVICE_INVALID_RESPONSE',
          message: 'Candidate application service returned an invalid response.',
          status: 503,
          cause
        });
      }

      return Object.freeze({
        status: response.status,
        headers: Object.freeze({ ...forwardedHeaders(response), ...(requestId ? { 'x-request-id': requestId } : {}) }),
        body: payload
      });
    }
  });
}
