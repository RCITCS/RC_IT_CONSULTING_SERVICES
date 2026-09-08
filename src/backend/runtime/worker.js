import { routeNeedsJsonBody } from '../api/router.js';
import { createBackendApplication } from '../application.js';
import { parseJsonText } from '../core/payload.js';

function toResponse(result) {
  return new Response(JSON.stringify(result.body), { status: result.status, headers: result.headers });
}

async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  const app = createBackendApplication({ runtime: 'cloudflare-workers', env });
  let body;
  try {
    if (routeNeedsJsonBody(url.pathname)) {
      const text = await request.text();
      body = parseJsonText(text, app.config.maxJsonBodyBytes);
    }
  } catch (error) {
    return toResponse(app.failure({ method: request.method, pathname: url.pathname, headers: request.headers, error }));
  }

  const result = await app.handle({ method: request.method, pathname: url.pathname, headers: request.headers, body });
  return toResponse(result);
}

async function serveApplication(request, env) {
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApiRequest(request, env);
    return serveApplication(request, env);
  }
};
