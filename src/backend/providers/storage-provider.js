import { providerUnavailable, validationError } from '../core/errors.js';
import { createSupabaseHttpClient } from './supabase-http.js';

export const MAX_CANDIDATE_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const CANDIDATE_DOCUMENT_TYPES = Object.freeze({
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
});

const UUID_SOURCE = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const uuid = new RegExp(`^${UUID_SOURCE}$`, 'i');
const generatedObjectPath = new RegExp(`^applications/${UUID_SOURCE}/documents/${UUID_SOURCE}\\.(pdf|doc|docx)$`, 'i');

function bytesOf(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  throw validationError('Document bytes are required.', { fields: ['document'] });
}

function startsWith(bytes, signature) {
  return signature.every((value, index) => bytes[index] === value);
}

function includesAscii(bytes, text) {
  const needle = new TextEncoder().encode(text);
  outer: for (let start = 0; start <= bytes.length - needle.length; start += 1) {
    for (let index = 0; index < needle.length; index += 1) {
      if (bytes[start + index] !== needle[index]) continue outer;
    }
    return true;
  }
  return false;
}

function signatureMatches(extension, bytes) {
  if (extension === 'pdf') return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (extension === 'doc') return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (extension === 'docx') {
    const zipSignature = startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06]) || startsWith(bytes, [0x50, 0x4b, 0x07, 0x08]);
    return zipSignature && includesAscii(bytes, '[Content_Types].xml') && includesAscii(bytes, 'word/');
  }
  return false;
}

function extensionOf(fileName) {
  const name = String(fileName || '').trim().toLowerCase();
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index + 1) : '';
}

function assertObjectPath(path) {
  const value = String(path || '');
  if (!value || value.length > 512 || !generatedObjectPath.test(value)) {
    throw new TypeError('Storage object path must be a generated candidate-document key.');
  }
  return value;
}

export function validateCandidateDocument({ fileName, mimeType, bytes } = {}) {
  const extension = extensionOf(fileName);
  const expectedMime = CANDIDATE_DOCUMENT_TYPES[extension];
  const content = bytesOf(bytes);
  if (!expectedMime) throw validationError('Document must be a PDF, DOC or DOCX file.', { fields: ['document'] });
  if (mimeType !== expectedMime) throw validationError('Document MIME type does not match its file extension.', { fields: ['document'] });
  if (!content.byteLength) throw validationError('Document is empty.', { fields: ['document'] });
  if (content.byteLength > MAX_CANDIDATE_DOCUMENT_BYTES) {
    throw validationError('Document must be 20 MB or smaller.', { fields: ['document'], maxBytes: MAX_CANDIDATE_DOCUMENT_BYTES });
  }
  if (!signatureMatches(extension, content)) throw validationError('Document content does not match its declared file type.', { fields: ['document'] });
  return Object.freeze({ extension, mimeType: expectedMime, sizeBytes: content.byteLength });
}

export function buildCandidateDocumentPath({ applicationId, documentId, extension } = {}) {
  if (!uuid.test(String(applicationId || '')) || !uuid.test(String(documentId || ''))) {
    throw new TypeError('Application and document IDs must be UUIDs.');
  }
  if (!CANDIDATE_DOCUMENT_TYPES[extension]) throw new TypeError('Unsupported candidate document extension.');
  return `applications/${applicationId}/documents/${documentId}.${extension}`;
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
