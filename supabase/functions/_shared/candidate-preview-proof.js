const HEX_64 = /^[0-9a-f]{64}$/i;
const encoder = new TextEncoder();

function text(value) {
  return String(value ?? '');
}

function canonicalPayload({ applicationId, adminId, requestId, subject, body, csrf } = {}) {
  const application = text(applicationId).trim().toLowerCase();
  const admin = text(adminId).trim().toLowerCase();
  const request = text(requestId).trim().toLowerCase();
  const cleanSubject = text(subject).trim();
  const cleanBody = text(body).trim();
  const csrfToken = text(csrf);
  if (!application || !admin || !request || !cleanSubject || !cleanBody || !csrfToken) {
    throw new TypeError('Candidate preview proof inputs are incomplete.');
  }
  return JSON.stringify([application, admin, request, cleanSubject, cleanBody, csrfToken]);
}

function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function secureHexEqual(left, right) {
  const a = text(left).toLowerCase();
  const b = text(right).toLowerCase();
  if (!HEX_64.test(a) || !HEX_64.test(b) || a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

async function signingKey(secret) {
  const material = text(secret);
  if (material.length < 16) throw new TypeError('Candidate preview proof secret is unavailable.');
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(material),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

export async function createCandidatePreviewProof({ secret, ...fields } = {}) {
  const key = await signingKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(canonicalPayload(fields)));
  return toHex(new Uint8Array(signature));
}

export async function verifyCandidatePreviewProof({ proof, secret, ...fields } = {}) {
  if (!HEX_64.test(text(proof))) return false;
  try {
    const expected = await createCandidatePreviewProof({ secret, ...fields });
    return secureHexEqual(expected, proof);
  } catch {
    return false;
  }
}
