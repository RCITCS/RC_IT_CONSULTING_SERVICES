import {
  handlePublicMediaRequest,
  isPublicMediaPath,
  parsePublicMediaRequest,
  pexelsUpstreamUrl
} from '../src/backend/runtime/public-media.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(isPublicMediaPath('/media/pexels/5439138'), 'Public Pexels media route must be recognized');
assert(!isPublicMediaPath('/media/example/5439138'), 'Unowned media routes must not be recognized');

const parsed = parsePublicMediaRequest('https://rcitcs.com/media/pexels/5439138?w=640');
assert(parsed?.photoId === '5439138', 'Media route must extract the numeric Pexels photo id');
assert(parsed?.width === 640, 'Media route must preserve an allowlisted responsive width');
assert(parsePublicMediaRequest('https://rcitcs.com/media/pexels/not-an-id?w=640') === null, 'Media route must reject non-numeric photo ids');
assert(parsePublicMediaRequest('https://rcitcs.com/media/pexels/5439138/extra?w=640') === null, 'Media route must reject path suffixes');
assert(parsePublicMediaRequest('https://rcitcs.com/media/pexels/5439138?w=999')?.width === 1280, 'Media route must coerce untrusted widths to the safe default');
assert(
  pexelsUpstreamUrl({ photoId: '5439138', width: 640 }) === 'https://images.pexels.com/photos/5439138/pexels-photo-5439138.jpeg?auto=compress&cs=tinysrgb&w=640',
  'Media route must construct the upstream URL only from validated values'
);

const originalFetch = globalThis.fetch;
const upstreamRequests = [];
globalThis.fetch = async (url, init = {}) => {
  upstreamRequests.push({ url: String(url), init });
  return new Response(new Uint8Array([1, 2, 3]), {
    status: 200,
    headers: {
      'content-type': 'image/jpeg',
      'content-length': '3',
      etag: '"phase19"',
      'set-cookie': '__cf_bm=must-not-reach-browser; Secure'
    }
  });
};

try {
  const response = await handlePublicMediaRequest(new Request('https://rcitcs.com/media/pexels/5439138?w=640', {
    headers: { accept: 'image/avif,image/webp,image/*' }
  }));
  assert(response.status === 200, 'Valid public media request must succeed');
  assert(response.headers.get('content-type') === 'image/jpeg', 'Public media response must preserve the safe image content type');
  assert(response.headers.get('cache-control')?.includes('public'), 'Public media response must be explicitly cacheable');
  assert(response.headers.get('x-content-type-options') === 'nosniff', 'Public media response must prevent content-type sniffing');
  assert(response.headers.get('set-cookie') === null, 'Third-party upstream cookies must never reach the browser');
  assert(upstreamRequests.length === 1, 'Valid public media request must make one constrained upstream request');
  assert(upstreamRequests[0].url === pexelsUpstreamUrl({ photoId: '5439138', width: 640 }), 'Public media request must use the constrained upstream URL');

  const invalidMethod = await handlePublicMediaRequest(new Request('https://rcitcs.com/media/pexels/5439138?w=640', { method: 'POST' }));
  assert(invalidMethod.status === 405, 'Public media route must reject mutating methods');
  assert(invalidMethod.headers.get('allow') === 'GET, HEAD', 'Public media route must advertise only safe read methods');

  const invalidPath = await handlePublicMediaRequest(new Request('https://rcitcs.com/media/pexels/not-an-id?w=640'));
  assert(invalidPath.status === 404, 'Invalid public media identifiers must fail closed');
} finally {
  globalThis.fetch = originalFetch;
}

console.log('PASS: Phase 19 public media delivery contract verified.');
