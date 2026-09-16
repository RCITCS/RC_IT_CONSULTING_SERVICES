import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePublicMediaRequest, pexelsUpstreamUrl } from '../src/backend/runtime/public-media.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(root, 'dist');
const port = Number(process.env.PORT || 4173);

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
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function safeDistPath(requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath).replaceAll('\\', '/');
  } catch {
    return null;
  }
  const normalized = path.posix.normalize(decoded);
  const candidate = path.resolve(distRoot, `.${normalized}`);
  const relative = path.relative(distRoot, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative)) ? candidate : null;
}

async function isFile(filePath) {
  if (!filePath) return false;
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function resolveRequestPath(pathname) {
  if (pathname === '/') return path.join(distRoot, 'index.html');

  const direct = safeDistPath(pathname);
  if (path.extname(pathname)) return (await isFile(direct)) ? direct : null;

  const routePath = safeDistPath(`${pathname.replace(/\/$/, '')}.html`);
  if (await isFile(routePath)) return routePath;

  const directoryIndex = safeDistPath(`${pathname.replace(/\/$/, '')}/index.html`);
  if (await isFile(directoryIndex)) return directoryIndex;

  return null;
}

function publicCacheControl(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'public, max-age=0, must-revalidate';
  if (['.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico'].includes(ext)) {
    return 'public, max-age=3600, stale-while-revalidate=86400';
  }
  return 'public, max-age=300, must-revalidate';
}

async function sendFile(req, res, filePath, status = 200) {
  const info = await stat(filePath);
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(status, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': publicCacheControl(filePath),
    'X-Content-Type-Options': 'nosniff'
  });
  if (req.method === 'HEAD') return res.end();
  createReadStream(filePath).pipe(res);
}

async function sendPublicMedia(req, res, url) {
  const parsed = parsePublicMediaRequest(url);
  if (!parsed) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end('Not found');
  }

  const upstream = await fetch(pexelsUpstreamUrl(parsed), {
    method: req.method,
    headers: req.headers.accept ? { accept: req.headers.accept } : {},
    redirect: 'follow'
  });
  const contentType = String(upstream.headers.get('content-type') || '').toLowerCase();
  if (!upstream.ok || !contentType.startsWith('image/')) {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end('Image upstream unavailable');
  }

  const body = req.method === 'HEAD' ? null : Buffer.from(await upstream.arrayBuffer());
  const headers = {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Referrer-Policy': 'no-referrer'
  };
  if (body) headers['Content-Length'] = body.length;
  res.writeHead(200, headers);
  return res.end(body);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' });
      return res.end();
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
    if (url.pathname.startsWith('/media/pexels/')) return await sendPublicMedia(req, res, url);

    const filePath = await resolveRequestPath(url.pathname);
    if (filePath) return await sendFile(req, res, filePath);

    const notFound = path.join(distRoot, '404.html');
    if (await isFile(notFound)) return await sendFile(req, res, notFound, 404);

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end('Not found');
  } catch (error) {
    console.error('Phase 19 preview server failure.', error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end('Preview server error');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Phase 19 production-like preview running at http://127.0.0.1:${port}`);
});
