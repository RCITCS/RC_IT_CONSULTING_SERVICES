import { createBackendApplication } from '../src/backend/application.js';
import { createPersistenceConfig } from '../src/backend/config/persistence.js';
import { noopLogger } from '../src/backend/core/logger.js';
import { createSupabaseDatabaseProvider } from '../src/backend/providers/database-provider.js';
import {
  MAX_CANDIDATE_DOCUMENT_BYTES,
  buildCandidateDocumentPath,
  createSupabaseStorageProvider,
  validateCandidateDocument
} from '../src/backend/providers/storage-provider.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const url = 'https://phase8-test.supabase.co';
const secret = 'sb_secret_test_server_only';
const config = createPersistenceConfig({ SUPABASE_URL: `${url}/`, SUPABASE_SECRET_KEY: secret });
assert(config.configured === true, 'Supabase config should require URL + server secret');
assert(config.url === url, 'Supabase URL should be normalized');
assert(config.storageBucket === 'candidate-documents', 'candidate bucket should have a safe default');
assert(createPersistenceConfig({ SUPABASE_URL: url }).configured === false, 'URL without secret must remain unconfigured');
assert(createPersistenceConfig({ SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: 'legacy-test' }).configured === true, 'legacy service-role key should remain migration-compatible');

const calls = [];
async function fakeFetch(requestUrl, options = {}) {
  calls.push({ requestUrl: String(requestUrl), options });
  if (String(requestUrl).includes('/rest/v1/contact_enquiries')) {
    const record = JSON.parse(options.body);
    return new Response(JSON.stringify([{ id: record.id }]), { status: 201, headers: { 'content-type': 'application/json' } });
  }
  if (String(requestUrl).includes('/storage/v1/object/sign/')) {
    return new Response(JSON.stringify({ signedURL: '/object/sign/candidate-documents/applications/test?token=fake' }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (String(requestUrl).includes('/storage/v1/object/')) {
    return new Response(JSON.stringify({ Key: 'candidate-documents/test.pdf' }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return new Response(JSON.stringify({ message: 'not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
}

const database = createSupabaseDatabaseProvider({ url, secretKey: secret, fetchImpl: fakeFetch });
assert(database.configured === true && database.name === 'supabase-postgres', 'database provider should configure from server credentials');

const app = createBackendApplication({
  runtime: 'test',
  env: { NODE_ENV: 'test', SUPABASE_URL: url, SUPABASE_SECRET_KEY: secret },
  fetchImpl: fakeFetch,
  logger: noopLogger
});
const validContact = {
  firstName: 'Phase',
  lastName: 'Eight',
  company: 'RC QA',
  jobTitle: 'Tester',
  email: 'phase8@example.com',
  phone: '+44 7700 900000',
  consultationTopic: 'Database architecture',
  message: 'Persist this enquiry.',
  privacyConsent: true
};
let result = await app.handle({ method: 'POST', pathname: '/api/contact', headers: {}, body: validContact });
assert(result.status === 201 && result.body.ok === true, `configured Supabase persistence should return 201, got ${result.status}`);
const databaseCall = calls.find((call) => call.requestUrl.includes('/rest/v1/contact_enquiries'));
assert(databaseCall, 'contact submission must use contact_enquiries persistence');
assert(databaseCall.options.headers.apikey === secret, 'database requests must authenticate with the server secret');
assert(databaseCall.options.headers.authorization === `Bearer ${secret}`, 'database Authorization must remain server-side');
assert(databaseCall.options.headers.prefer === 'return=representation', 'database write must require persisted representation');
const persistedContact = JSON.parse(databaseCall.options.body);
assert(persistedContact.id === result.body.data.id, 'API result ID must equal persisted database ID');
assert(persistedContact.email === validContact.email && persistedContact.source_type === 'contact', 'normalized enquiry fields must be persisted');
assert(!('privacyConsent' in persistedContact), 'consent UX field should not be duplicated into general enquiry storage');

const pdf = new TextEncoder().encode('%PDF-1.7\nphase8');
let metadata = validateCandidateDocument({ fileName: 'resume.pdf', mimeType: 'application/pdf', bytes: pdf });
assert(metadata.extension === 'pdf' && metadata.sizeBytes === pdf.byteLength, 'PDF signature/type validation should succeed');
metadata = validateCandidateDocument({
  fileName: 'resume.doc',
  mimeType: 'application/msword',
  bytes: new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00])
});
assert(metadata.extension === 'doc', 'DOC OLE signature validation should succeed');
metadata = validateCandidateDocument({
  fileName: 'cover.docx',
  mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  bytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00])
});
assert(metadata.extension === 'docx', 'DOCX ZIP signature validation should succeed');

let rejected = false;
try {
  validateCandidateDocument({ fileName: 'resume.pdf', mimeType: 'application/msword', bytes: pdf });
} catch (error) {
  rejected = error?.status === 422;
}
assert(rejected, 'extension/MIME mismatch must be rejected');

rejected = false;
try {
  validateCandidateDocument({ fileName: 'resume.pdf', mimeType: 'application/pdf', bytes: new Uint8Array(MAX_CANDIDATE_DOCUMENT_BYTES + 1) });
} catch (error) {
  rejected = error?.status === 422 && error?.details?.maxBytes === MAX_CANDIDATE_DOCUMENT_BYTES;
}
assert(rejected, 'candidate documents larger than 20 MiB must be rejected');

const applicationId = '11111111-1111-4111-8111-111111111111';
const documentId = '22222222-2222-4222-8222-222222222222';
const objectPath = buildCandidateDocumentPath({ applicationId, documentId, extension: 'pdf' });
assert(objectPath === `applications/${applicationId}/documents/${documentId}.pdf`, 'candidate object path must use generated UUIDs');
assert(!objectPath.includes('resume'), 'user filenames must not become private object keys');

const storage = createSupabaseStorageProvider({ url, secretKey: secret, bucket: 'candidate-documents', fetchImpl: fakeFetch });
const upload = await storage.uploadPrivateObject({ path: objectPath, bytes: pdf, contentType: 'application/pdf' });
assert(upload.path === objectPath, 'private storage upload should return only the generated path');
const signed = await storage.createSignedDownloadUrl({ path: objectPath, expiresIn: 300 });
assert(signed.url.startsWith(`${url}/storage/v1/object/sign/`), 'private retrieval must use a signed storage URL');
assert(signed.expiresIn === 300, 'signed URL expiry must be explicit');

rejected = false;
try { await storage.createSignedDownloadUrl({ path: objectPath, expiresIn: 901 }); } catch (error) { rejected = error instanceof TypeError; }
assert(rejected, 'signed URLs must not exceed the 15 minute maximum');

const failingApp = createBackendApplication({
  runtime: 'test',
  env: { SUPABASE_URL: url, SUPABASE_SECRET_KEY: secret },
  fetchImpl: async () => new Response(JSON.stringify({ internal: 'sensitive provider detail' }), { status: 500 }),
  logger: noopLogger
});
result = await failingApp.handle({ method: 'POST', pathname: '/api/contact', headers: {}, body: validContact });
assert(result.status === 502 && result.body.code === 'DATA_PROVIDER_REQUEST_FAILED', 'upstream database rejection must normalize to 502');
assert(!JSON.stringify(result.body).includes('sensitive provider detail'), 'provider response details must not leak to clients');

console.log('PASS: Phase 8 Supabase configuration, durable enquiry repository, server-only auth, private 20 MiB PDF/DOC/DOCX validation, generated object keys, signed retrieval and provider-failure isolation verified.');
