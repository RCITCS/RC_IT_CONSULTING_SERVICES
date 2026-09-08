import http from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { routeNeedsJsonBody } from './src/backend/api/router.js';
import { createBackendApplication } from './src/backend/application.js';
import { BackendError } from './src/backend/core/errors.js';
import { parseJsonText } from './src/backend/core/payload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const FRONTEND_JS_DIR = path.join(__dirname, 'src', 'frontend', 'app');
const FRONTEND_CSS_DIR = path.join(__dirname, 'src', 'frontend', 'styles');
const BOOTSTRAP_GRID = path.join(__dirname, 'node_modules', 'bootstrap', 'dist', 'css', 'bootstrap-grid.min.css');
const PORT = Number(process.env.PORT || 4173);
const backend = createBackendApplication({ runtime: 'node-local', env: process.env });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://images.unsplash.com https://images.pexels.com",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src https://www.google.com"
  ].join('; ')
};

async function readRequestText(req, maxBytes) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      throw new BackendError({ code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.', status: 413 });
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function sendApiResult(res, result) {
  res.writeHead(result.status, { ...securityHeaders, ...result.headers });
  res.end(JSON.stringify(result.body));
}

async function handleApi(req, res, url) {
  let body;
  try {
    if (routeNeedsJsonBody(url.pathname, req.method)) {
      const text = await readRequestText(req, backend.config.maxJsonBodyBytes);
      body = parseJsonText(text, backend.config.maxJsonBodyBytes);
    }
  } catch (error) {
    return sendApiResult(res, backend.failure({ method: req.method, pathname: url.pathname, headers: req.headers, error }));
  }
  const result = await backend.handle({ method: req.method, pathname: url.pathname, headers: req.headers, body });
  return sendApiResult(res, result);
}

async function serveFile(res, filePath, cache = false) {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return false;
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      ...securityHeaders,
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': cache ? 'public, max-age=3600' : 'no-cache'
    });
    createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

function safePath(root, requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath).replaceAll('\\', '/');
  } catch {
    return null;
  }
  const normalized = path.posix.normalize(decoded);
  const candidate = path.resolve(root, `.${normalized}`);
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative)) ? candidate : null;
}

async function serveDevelopmentSource(res, pathname) {
  if (pathname === '/vendor/bootstrap-grid.css') return serveFile(res, BOOTSTRAP_GRID, true);
  if (pathname.startsWith('/js/')) {
    const candidate = safePath(FRONTEND_JS_DIR, pathname.slice('/js'.length));
    return candidate ? serveFile(res, candidate, false) : false;
  }
  if (pathname.startsWith('/css/')) {
    const candidate = safePath(FRONTEND_CSS_DIR, pathname.slice('/css'.length));
    return candidate ? serveFile(res, candidate, false) : false;
  }
  return false;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (await serveDevelopmentSource(res, url.pathname)) return;

    const candidate = safePath(PUBLIC_DIR, url.pathname);
    if (!candidate) {
      res.writeHead(403, securityHeaders);
      return res.end('Forbidden');
    }

    if (path.extname(candidate) && await serveFile(res, candidate, true)) return;
    await serveFile(res, path.join(PUBLIC_DIR, 'index.html'), false);
  } catch {
    res.writeHead(500, { ...securityHeaders, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('Unexpected server error.');
  }
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, '0.0.0.0', () => console.log(`RC IT Services running at http://localhost:${PORT}`));
}

export { server };
