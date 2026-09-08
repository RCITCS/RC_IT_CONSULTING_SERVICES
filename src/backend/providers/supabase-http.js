import { BackendError } from '../core/errors.js';

function safeJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

function authHeaders(secretKey) {
  return {
    apikey: secretKey,
    ...(String(secretKey).startsWith('sb_secret_') ? {} : { authorization: `Bearer ${secretKey}` })
  };
}

export function createSupabaseHttpClient({ url, secretKey, fetchImpl = globalThis.fetch } = {}) {
  if (!url || !secretKey) throw new TypeError('Supabase URL and server secret key are required.');
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');
  const baseUrl = String(url).replace(/\/+$/, '');

  async function request(path, { method = 'GET', headers = {}, json, body } = {}) {
    let response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: {
          ...authHeaders(secretKey),
          ...headers,
          ...(json !== undefined ? { 'content-type': 'application/json' } : {})
        },
        body: json !== undefined ? JSON.stringify(json) : body
      });
    } catch (cause) {
      throw new BackendError({
        code: 'DATA_PROVIDER_UNREACHABLE',
        message: 'The configured data service could not be reached.',
        status: 503,
        expose: true,
        cause
      });
    }

    const text = response.status === 204 || method === 'HEAD' ? '' : await response.text();
    const payload = safeJson(text);
    if (!response.ok) {
      throw new BackendError({
        code: 'DATA_PROVIDER_REQUEST_FAILED',
        message: 'The configured data service rejected the request.',
        status: 502,
        expose: true,
        details: { providerStatus: response.status }
      });
    }
    return payload;
  }

  return Object.freeze({ baseUrl, request });
}
