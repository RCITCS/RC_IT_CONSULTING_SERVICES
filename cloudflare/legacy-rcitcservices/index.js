const CANONICAL_PUBLIC_WORKER = 'https://rc-it-consulting-services.rcitcservices.workers.dev';

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const upstream = new URL(`${incoming.pathname}${incoming.search}`, CANONICAL_PUBLIC_WORKER);
    const headers = new Headers(request.headers);
    headers.delete('host');

    return fetch(new Request(upstream, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual'
    }));
  }
};
