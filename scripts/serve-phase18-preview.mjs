import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handlePublicMediaRequest } from '../src/backend/runtime/public-media.js';

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

async function sendFile(req, res, filePath, status = 200) {
  const info = await stat(filePath);
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(status, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  if (req.method === 'HEAD') return res.end();
  createReadStream(filePath).pipe(res);
}

async function sendPublicMedia(req, res, url) {
  const headers = new Headers();
  if (req.headers.accept) headers.set('accept', req.headers.accept);

  const response = await handlePublicMediaRequest(new Request(url, {
    method: req.method,
    headers
  }));
  const responseHeaders = Object.fromEntries(response.headers.entries());
  res.writeHead(response.status, responseHeaders);

  if (req.method === 'HEAD' || !response.body) return res.end();
  return res.end(Buffer.from(await response.arrayBuffer()));
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
    console.error('Phase 18 preview server failure.', error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end('Preview server error');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Phase 18 production preview running at http://127.0.0.1:${port}`);
});
