export const DEFAULT_CANDIDATE_DOCUMENT_BUCKET = 'candidate-documents';

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeUrl(value) {
  const raw = clean(value).replace(/\/+$/, '');
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString().replace(/\/$/, '') : '';
  } catch {
    return '';
  }
}

function jwtRole(value) {
  const parts = clean(value).split('.');
  if (parts.length !== 3 || typeof globalThis.atob !== 'function') return '';
  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return String(JSON.parse(globalThis.atob(padded))?.role || '');
  } catch {
    return '';
  }
}

function serverSecret(value) {
  const key = clean(value);
  if (!key || key.startsWith('sb_publishable_')) return '';
  if (key.startsWith('sb_secret_')) return key;
  return jwtRole(key) === 'service_role' ? key : '';
}

export function createPersistenceConfig(source = {}) {
  const url = normalizeUrl(source.SUPABASE_URL);
  const secretKey = serverSecret(source.SUPABASE_SECRET_KEY || source.SUPABASE_SERVICE_ROLE_KEY);
  const storageBucket = clean(source.SUPABASE_STORAGE_BUCKET) || DEFAULT_CANDIDATE_DOCUMENT_BUCKET;
  return Object.freeze({
    provider: 'supabase',
    url,
    secretKey,
    storageBucket,
    configured: Boolean(url && secretKey)
  });
}
