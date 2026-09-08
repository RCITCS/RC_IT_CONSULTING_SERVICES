export const PRIMARY_HOSTNAME = 'rcitcs.com';
export const PRIMARY_ORIGIN = `https://${PRIMARY_HOSTNAME}`;
export const WWW_HOSTNAME = `www.${PRIMARY_HOSTNAME}`;

export function canonicalHostRedirect(url) {
  if (url.hostname !== WWW_HOSTNAME) return null;
  const destination = new URL(url.toString());
  destination.protocol = 'https:';
  destination.hostname = PRIMARY_HOSTNAME;
  destination.port = '';
  return Response.redirect(destination.toString(), 308);
}

export function isolateSecondaryOrigin(response, hostname) {
  if (hostname === PRIMARY_HOSTNAME || hostname === WWW_HOSTNAME) return response;
  const headers = new Headers(response.headers);
  headers.set('x-robots-tag', 'noindex, nofollow');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
