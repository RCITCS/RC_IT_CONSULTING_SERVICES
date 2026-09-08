import { routeNeedsJsonBody } from '../src/backend/api/router.js';
import { createBackendApplication } from '../src/backend/application.js';
import { validateParsedJsonBody } from '../src/backend/core/payload.js';

function applyResult(res, result) {
  for (const [name, value] of Object.entries(result.headers)) res.setHeader(name, value);
  return res.status(result.status).json(result.body);
}

export default async function handler(req, res) {
  const action = Array.isArray(req.query?.action) ? req.query.action[0] : req.query?.action;
  const pathname = `/api/${String(action || '')}`;
  const app = createBackendApplication({ runtime: 'vercel', env: process.env });
  let body;
  try {
    if (routeNeedsJsonBody(pathname)) body = validateParsedJsonBody(req.body, app.config.maxJsonBodyBytes);
  } catch (error) {
    return applyResult(res, app.failure({ method: req.method, pathname, headers: req.headers, error }));
  }
  return applyResult(res, await app.handle({ method: req.method, pathname, headers: req.headers, body }));
}
