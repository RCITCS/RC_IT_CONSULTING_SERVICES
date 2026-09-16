const PUBLIC_MEDIA_PREFIX = '/media/pexels/';
const PEXELS_PHOTO_ID = /^\d{1,12}$/;
const ALLOWED_WIDTHS = new Set([320, 360, 480, 640, 720, 960, 1200, 1280, 1600, 1800]);
const DEFAULT_WIDTH = 1280;
const PUBLIC_CACHE_CONTROL = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400';

export function isPublicMediaPath(pathname = '') {
  return String(pathname).startsWith(PUBLIC_MEDIA_PREFIX);
}

export function parsePublicMediaRequest(input) {
  const url = input instanceof URL ? input : new URL(String(input), 'https://rcitcs.com');
  if (!isPublicMediaPath(url.pathname)) return null;

  const photoId = url.pathname.slice(PUBLIC_MEDIA_PREFIX.length);
  if (!PEXELS_PHOTO_ID.test(photoId)) return null;

  const requestedWidth = Number.parseInt(url.searchParams.get('w') || '', 10);
  const width = ALLOWED_WIDTHS.has(requestedWidth) ? requestedWidth : DEFAULT_WIDTH;
  return { photoId, width };
}

export function pexelsUpstreamUrl({ photoId, width }) {
  return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
}

function mediaHeaders(contentType = 'image/jpeg') {
  return new Headers({
    'content-type': contentType,
    'cache-control': PUBLIC_CACHE_CONTROL,
    'x-content-type-options': 'nosniff',
    'cross-origin-resource-policy': 'same-origin',
    'referrer-policy': 'no-referrer'
  });
}

function mediaFailure(status, message) {
  return new Response(message, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

export async function handlePublicMediaRequest(request) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    const response = mediaFailure(405, 'Method Not Allowed');
    response.headers.set('allow', 'GET, HEAD');
    return response;
  }

  const parsed = parsePublicMediaRequest(request.url);
  if (!parsed) return mediaFailure(404, 'Not Found');

  const upstreamHeaders = new Headers();
  const accept = request.headers.get('accept');
  if (accept) upstreamHeaders.set('accept', accept);

  try {
    const upstream = await fetch(pexelsUpstreamUrl(parsed), {
      method: request.method,
      headers: upstreamHeaders,
      redirect: 'follow'
    });

    if (!upstream.ok) return mediaFailure(502, 'Image upstream unavailable');

    const contentType = String(upstream.headers.get('content-type') || '').toLowerCase();
    if (!contentType.startsWith('image/')) return mediaFailure(502, 'Invalid image upstream response');

    const headers = mediaHeaders(contentType);
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) headers.set('content-length', contentLength);
    const etag = upstream.headers.get('etag');
    if (etag) headers.set('etag', etag);

    return new Response(request.method === 'HEAD' ? null : upstream.body, {
      status: 200,
      headers
    });
  } catch {
    return mediaFailure(502, 'Image upstream unavailable');
  }
}
