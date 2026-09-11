export const MAX_CANDIDATE_DOCUMENT_BYTES = 20 * 1024 * 1024;

export const CANDIDATE_DOCUMENT_TYPES = Object.freeze({
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
});

const UUID_SOURCE = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const uuid = new RegExp(`^${UUID_SOURCE}$`, 'i');
const generatedObjectPath = new RegExp(`^applications/${UUID_SOURCE}/documents/${UUID_SOURCE}\\.(pdf|doc|docx)$`, 'i');

export function candidateDocumentExtension(fileName = '') {
  const name = String(fileName || '').trim().toLowerCase();
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index + 1) : '';
}

function bytesOf(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return null;
}

function startsWith(bytes, signature) {
  return signature.every((value, index) => bytes[index] === value);
}

function includesAscii(bytes, text) {
  const needle = new TextEncoder().encode(text);
  if (!needle.length || needle.length > bytes.length) return false;

  let from = 0;
  const lastStart = bytes.length - needle.length;
  while (from <= lastStart) {
    const start = bytes.indexOf(needle[0], from);
    if (start < 0 || start > lastStart) return false;

    let matched = true;
    for (let index = 1; index < needle.length; index += 1) {
      if (bytes[start + index] !== needle[index]) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
    from = start + 1;
  }
  return false;
}

function signatureMatches(extension, bytes) {
  if (extension === 'pdf') return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (extension === 'doc') return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (extension === 'docx') {
    const zipSignature = startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])
      || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])
      || startsWith(bytes, [0x50, 0x4b, 0x07, 0x08]);
    return zipSignature && includesAscii(bytes, '[Content_Types].xml') && includesAscii(bytes, 'word/');
  }
  return false;
}

export function inspectCandidateDocument({ fileName, mimeType, bytes } = {}) {
  const extension = candidateDocumentExtension(fileName);
  const expectedMime = CANDIDATE_DOCUMENT_TYPES[extension];
  const content = bytesOf(bytes);

  if (!expectedMime) {
    return Object.freeze({ ok: false, code: 'UNSUPPORTED_TYPE', message: 'Document must be a PDF, DOC or DOCX file.' });
  }
  if (mimeType !== expectedMime) {
    return Object.freeze({ ok: false, code: 'MIME_MISMATCH', message: 'Document MIME type does not match its file extension.' });
  }
  if (!content) {
    return Object.freeze({ ok: false, code: 'MISSING_BYTES', message: 'Document bytes are required.' });
  }
  if (!content.byteLength) {
    return Object.freeze({ ok: false, code: 'EMPTY_DOCUMENT', message: 'Document is empty.' });
  }
  if (content.byteLength > MAX_CANDIDATE_DOCUMENT_BYTES) {
    return Object.freeze({ ok: false, code: 'DOCUMENT_TOO_LARGE', message: 'Document must be 20 MB or smaller.', maxBytes: MAX_CANDIDATE_DOCUMENT_BYTES });
  }
  if (!signatureMatches(extension, content)) {
    return Object.freeze({ ok: false, code: 'CONTENT_MISMATCH', message: 'Document content does not match its declared file type.' });
  }

  return Object.freeze({ ok: true, extension, mimeType: expectedMime, sizeBytes: content.byteLength });
}

export function isGeneratedCandidateDocumentPath(path = '') {
  const value = String(path || '');
  return Boolean(value && value.length <= 512 && generatedObjectPath.test(value));
}

export function buildCandidateDocumentPath({ applicationId, documentId, extension } = {}) {
  if (!uuid.test(String(applicationId || '')) || !uuid.test(String(documentId || ''))) {
    throw new TypeError('Application and document IDs must be UUIDs.');
  }
  if (!CANDIDATE_DOCUMENT_TYPES[extension]) throw new TypeError('Unsupported candidate document extension.');
  return `applications/${applicationId}/documents/${documentId}.${extension}`;
}
