import { createPersistenceConfig } from '../src/backend/config/persistence.js';
import { createSupabaseHttpClient } from '../src/backend/providers/supabase-http.js';
import { buildCandidateDocumentPath, createSupabaseStorageProvider, validateCandidateDocument } from '../src/backend/providers/storage-provider.js';

function assert(condition, message) { if (!condition) throw new Error(message); }
function concatBytes(...parts) {
  const arrays = parts.map((part) => typeof part === 'string' ? new TextEncoder().encode(part) : new Uint8Array(part));
  const output = new Uint8Array(arrays.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;
  for (const part of arrays) { output.set(part, offset); offset += part.byteLength; }
  return output;
}

const url = 'https://phase8-hardening.supabase.co';
const secret = 'sb_secret_phase8_hardening';
assert(createPersistenceConfig({ SUPABASE_URL: url, SUPABASE_SECRET_KEY: 'sb_publishable_not_server' }).configured === false, 'publishable key must not configure persistence');

const captured = [];
const client = createSupabaseHttpClient({ url, secretKey: secret, fetchImpl: async (_url, options) => {
  captured.push(options.headers);
  return new Response('{}', { status: 200 });
} });
await client.request('/rest/v1/');
assert(captured[0].apikey === secret, 'secret key must be sent as apikey');
assert(!('authorization' in captured[0]), 'new Supabase secret key must not be sent as Bearer JWT');

let rejected = false;
try {
  validateCandidateDocument({
    fileName: 'cover.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    bytes: concatBytes([0x50,0x4b,0x03,0x04], 'ordinary-archive.zip')
  });
} catch (error) { rejected = error?.status === 422; }
assert(rejected, 'ordinary ZIP must be rejected as DOCX');

const applicationId = '11111111-1111-4111-8111-111111111111';
const documentId = '22222222-2222-4222-8222-222222222222';
const objectPath = buildCandidateDocumentPath({ applicationId, documentId, extension: 'pdf' });
const pdf = new TextEncoder().encode('%PDF-1.7\nhardening');
const storage = createSupabaseStorageProvider({ url, secretKey: secret, bucket: 'candidate-documents', fetchImpl: async () => new Response(JSON.stringify({ Key: objectPath }), { status: 200 }) });

let mimeRejected = false;
try { await storage.uploadPrivateObject({ path: objectPath, bytes: pdf, contentType: 'application/msword' }); } catch (error) { mimeRejected = error?.status === 422; }
assert(mimeRejected, 'storage provider must independently reject MIME/path mismatch');

let pathRejected = false;
try { await storage.uploadPrivateObject({ path: 'applications/not-a-uuid/documents/file.pdf', bytes: pdf, contentType: 'application/pdf' }); } catch (error) { pathRejected = error instanceof TypeError; }
assert(pathRejected, 'storage provider must independently reject non-generated paths');

console.log('PASS: Phase 8 independent hardening checks reject publishable keys, Bearer misuse, arbitrary ZIP/DOCX spoofing, MIME mismatch and non-generated private paths.');
