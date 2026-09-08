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

export function createPersistenceConfig(source = {}) {
  const url = normalizeUrl(source.SUPABASE_URL);
  const secretKey = clean(source.SUPABASE_SECRET_KEY || source.SUPABASE_SERVICE_ROLE_KEY);
  const storageBucket = clean(source.SUPABASE_STORAGE_BUCKET) || DEFAULT_CANDIDATE_DOCUMENT_BUCKET;
  return Object.freeze({
    provider: 'supabase',
    url,
    secretKey,
    storageBucket,
    configured: Boolean(url && secretKey)
  });
}
