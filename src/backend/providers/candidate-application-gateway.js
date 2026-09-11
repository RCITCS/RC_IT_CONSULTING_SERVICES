import { createPersistenceConfig } from '../config/persistence.js';
import { BackendError, providerUnavailable } from '../core/errors.js';
import { createSupabaseHttpClient } from './supabase-http.js';

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
  try { return new URL(String(value || '')).origin; } catch { return ''; }
}

function trustedClientIp(runtime, headers) {
  if (runtime === 'cloudflare-workers') return headerValue(headers, 'cf-connecting-ip').trim();
  if (runtime === 'vercel') {
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
  if (runtime === 'node-local' && /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin)) return origin;
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

function objectPaths(claim) {
  return (Array.isArray(claim?.documents) ? claim.documents : [])
    .map((document) => String(document?.object_path || '').trim())
    .filter(Boolean);
}

export function createCandidateApplicationGateway({ env = {}, runtime = 'unknown', fetchImpl = globalThis.fetch } = {}) {
  const persistence = createPersistenceConfig(env);
  const proxy = proxyName(runtime);
  const endpoint = persistence.url ? `${persistence.url}/functions/v1/candidate-applications` : '';
  const client = persistence.configured
    ? createSupabaseHttpClient({ url: persistence.url, secretKey: persistence.secretKey, fetchImpl })
    : null;

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
        throw new BackendError({ code: 'REQUEST_REJECTED', message: 'The candidate application request could not be verified.', status: 403 });
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
        throw new BackendError({ code: 'APPLICATION_SERVICE_UNAVAILABLE', message: 'Candidate application service is temporarily unavailable.', status: 503, cause });
      }

      let payload;
      try { payload = await response.json(); }
      catch (cause) {
        throw new BackendError({ code: 'APPLICATION_SERVICE_INVALID_RESPONSE', message: 'Candidate application service returned an invalid response.', status: 503, cause });
      }

      return Object.freeze({
        status: response.status,
        headers: Object.freeze({ ...forwardedHeaders(response), ...(requestId ? { 'x-request-id': requestId } : {}) }),
        body: payload
      });
    },

    async cleanupExpired({ limit = 10 } = {}) {
      if (runtime !== 'cloudflare-workers' || !client) {
        throw providerUnavailable('candidate_application_cleanup', 'Candidate application cleanup is not configured for this runtime.');
      }
      const boundedLimit = Math.max(1, Math.min(Number.isSafeInteger(limit) ? limit : 10, 50));
      const claimed = await client.request('/rest/v1/rpc/claim_expired_candidate_intakes', {
        method: 'POST',
        json: { p_limit: boundedLimit }
      });
      const claims = Array.isArray(claimed?.claims) ? claimed.claims : [];
      let cleaned = 0;
      let failed = 0;

      for (const claim of claims) {
        try {
          const paths = objectPaths(claim);
          if (paths.length) {
            await client.request(`/storage/v1/object/${encodeURIComponent(persistence.storageBucket)}`, {
              method: 'DELETE',
              json: { prefixes: paths }
            });
          }
          const completed = await client.request('/rest/v1/rpc/complete_expired_candidate_intake_cleanup', {
            method: 'POST',
            json: { p_intake_id: claim.intake_id, p_token_hash: claim.token_hash }
          });
          if (completed?.ok !== true) throw new Error('cleanup completion rejected');
          cleaned += 1;
        } catch {
          failed += 1;
        }
      }

      if (failed > 0) {
        throw new BackendError({
          code: 'CANDIDATE_CLEANUP_INCOMPLETE',
          message: 'One or more expired candidate upload sessions could not be cleaned.',
          status: 503,
          details: { claimed: claims.length, cleaned, failed }
        });
      }
      return Object.freeze({ claimed: claims.length, cleaned, failed: 0 });
    }
  });
}
