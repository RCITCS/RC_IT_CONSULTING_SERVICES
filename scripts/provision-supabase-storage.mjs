import { createPersistenceConfig } from '../src/backend/config/persistence.js';
import { CANDIDATE_DOCUMENT_TYPES, MAX_CANDIDATE_DOCUMENT_BYTES } from '../src/backend/providers/storage-provider.js';

const config = createPersistenceConfig(process.env);
if (!config.configured) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required to provision storage.');

const headers = {
  apikey: config.secretKey,
  authorization: `Bearer ${config.secretKey}`,
  'content-type': 'application/json'
};
const bucketUrl = `${config.url}/storage/v1/bucket/${encodeURIComponent(config.storageBucket)}`;
const details = await fetch(bucketUrl, { method: 'HEAD', headers });
const body = {
  id: config.storageBucket,
  name: config.storageBucket,
  public: false,
  file_size_limit: MAX_CANDIDATE_DOCUMENT_BYTES,
  allowed_mime_types: Object.values(CANDIDATE_DOCUMENT_TYPES)
};

let response;
if (details.ok) {
  response = await fetch(bucketUrl, { method: 'PUT', headers, body: JSON.stringify(body) });
} else if (details.status === 404) {
  response = await fetch(`${config.url}/storage/v1/bucket`, { method: 'POST', headers, body: JSON.stringify(body) });
} else {
  throw new Error(`Unable to inspect private storage bucket: HTTP ${details.status}`);
}
if (!response.ok) throw new Error(`Unable to provision private storage bucket: HTTP ${response.status}`);
console.log(`PASS: private Supabase bucket '${config.storageBucket}' is configured with 20 MiB and PDF/DOC/DOCX restrictions.`);
