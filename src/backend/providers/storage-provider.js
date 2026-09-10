import { providerUnavailable, validationError } from '../core/errors.js';
import { createSupabaseHttpClient } from './supabase-http.js';
import {
  MAX_CANDIDATE_DOCUMENT_BYTES,
  CANDIDATE_DOCUMENT_TYPES,
  buildCandidateDocumentPath,
  inspectCandidateDocument,
  isGeneratedCandidateDocumentPath
} from '../../../supabase/functions/_shared/candidate-document-contract.js';

export { MAX_CANDIDATE_DOCUMENT_BYTES, CANDIDATE_DOCUMENT_TYPES, buildCandidateDocumentPath };

function bytesOf(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  throw validationError('Document bytes are required.', { fields: ['document'] });
}

function assertObjectPath(path) {
  const value = String(path || '');
  if (!isGeneratedCandidateDocumentPath(value)) {
    throw new TypeError('Storage object path must be a generated candidate-document key.');
  }
  return value;
}

export function validateCandidateDocument({ fileName, mimeType, bytes } = {}) {
  const result = inspectCandidateDocument({ fileName, mimeType, bytes });
  if (!result.ok) {
    throw validationError(result.message, {
      fields: ['document'],
      ...(result.maxBytes ? { maxBytes: result.maxBytes } : {}),
      documentCode: result.code
    });
  }
  return Object.freeze({ extension: result.extension, mimeType: result.mimeType, sizeBytes: result.sizeBytes });
}

export function createStorageProvider() {
  return Object.freeze({
    kind: 'storage',
    name: 'unconfigured-storage',
    configured: false,
    async uploadPrivateObject() { throw providerUnavailable('storage', 'Private document storage is not configured.'); },
    async createSignedDownloadUrl() { throw providerUnavailable('storage', 'Private document storage is not configured.'); }
  });
}

export function createSupabaseStorageProvider({ url, secretKey, bucket, fetchImpl } = {}) {
  if (!url || !secretKey || !bucket) return createStorageProvider();
  const client = createSupabaseHttpClient({ url, secretKey, fetchImpl });
  const bucketName = encodeURIComponent(bucket);
  return Object.freeze({
    kind: 'storage',
    name: 'supabase-private-storage',
    configured: true,
    bucket,
    async uploadPrivateObject({ path, bytes, contentType } = {}) {
      const objectPath = assertObjectPath(path);
      const content = bytesOf(bytes);
      validateCandidateDocument({ fileName: objectPath, mimeType: contentType, bytes: content });
      const result = await client.request(`/storage/v1/object/${bucketName}/${objectPath.split('/').map(encodeURIComponent).join('/')}`, {
        method: 'POST',
        headers: { 'content-type': contentType, 'x-upsert': 'false', 'cache-control': 'no-store' },
        body: content
      });
      if (!result?.Key && !result?.key) throw new Error('Storage upload did not confirm an object key.');
      return Object.freeze({ path: objectPath });
    },
    async createSignedDownloadUrl({ path, expiresIn = 300 } = {}) {
      const objectPath = assertObjectPath(path);
      if (!Number.isInteger(expiresIn) || expiresIn < 30 || expiresIn > 900) throw new TypeError('Signed download expiry must be between 30 and 900 seconds.');
      const result = await client.request(`/storage/v1/object/sign/${bucketName}/${objectPath.split('/').map(encodeURIComponent).join('/')}`, {
        method: 'POST',
        json: { expiresIn }
      });
      const signed = result?.signedURL || result?.signedUrl;
      if (!signed) throw new Error('Storage service did not return a signed URL.');
      return Object.freeze({ url: signed.startsWith('http') ? signed : `${client.baseUrl}/storage/v1${signed}`, expiresIn });
    }
  });
}
