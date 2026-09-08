import http from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = process.env.RC_DATA_DIR ? path.resolve(process.env.RC_DATA_DIR) : path.join(__dirname, 'data');
const UPLOAD_DIR = process.env.RC_UPLOAD_DIR ? path.resolve(process.env.RC_UPLOAD_DIR) : path.join(__dirname, 'uploads', 'resumes');
const PORT = Number(process.env.PORT || 4173);
const MAX_JSON_BODY = 7 * 1024 * 1024;
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

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
    "img-src 'self' data: https://images.unsplash.com",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src https://www.google.com"
  ].join('; ')
};

function sendJson(res, status, payload) {
  res.writeHead(status, { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}

function cleanText(value, max = 4000) {
  return String(value ?? '').replace(/\0/g, '').trim().slice(0, max);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(cleanText(value, 254));
}

function isPhone(value) {
  return /^[+()\d\s.-]{7,30}$/.test(cleanText(value, 30));
}

async function parseJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_JSON_BODY) {
      const error = new Error('Request body too large');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Invalid JSON');
    error.statusCode = 400;
    throw error;
  }
}

async function appendRecord(fileName, record) {
  await mkdir(DATA_DIR, { recursive: true });
  const filePath = path.join(DATA_DIR, fileName);
  let existing = [];
  try {
    existing = JSON.parse(await readFile(filePath, 'utf8'));
    if (!Array.isArray(existing)) existing = [];
  } catch {
    existing = [];
  }
  existing.push(record);
  await writeFile(filePath, JSON.stringify(existing, null, 2) + '\n', 'utf8');
}

function makeRecord(payload, fields) {
  const out = {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString()
  };
  for (const [key, max] of fields) out[key] = cleanText(payload[key], max);
  return out;
}

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, service: 'rc-it-services', now: new Date().toISOString() });
  }

  if (req.method !== 'POST') return false;
  const payload = await parseJson(req);

  if (url.pathname === '/api/contact') {
    const record = makeRecord(payload, [
      ['firstName', 80], ['lastName', 80], ['company', 140], ['phone', 30],
      ['businessEmail', 254], ['jobTitle', 140], ['message', 4000], ['intent', 80]
    ]);
    const missing = ['firstName', 'lastName', 'company', 'phone', 'businessEmail', 'jobTitle'].filter((key) => !record[key]);
    if (missing.length) return sendJson(res, 422, { ok: false, message: `Missing required fields: ${missing.join(', ')}` });
    if (!isEmail(record.businessEmail)) return sendJson(res, 422, { ok: false, message: 'Enter a valid business email.' });
    if (!isPhone(record.phone)) return sendJson(res, 422, { ok: false, message: 'Enter a valid phone number.' });
    await appendRecord('contact-submissions.json', record);
    return sendJson(res, 201, { ok: true, id: record.id, message: 'Your enquiry has been recorded.' });
  }

  if (url.pathname === '/api/demo') {
    const record = makeRecord(payload, [
      ['name', 120], ['company', 140], ['businessEmail', 254], ['phone', 30],
      ['product', 120], ['notes', 3000]
    ]);
    if (!record.name || !record.company || !record.businessEmail || !record.product) {
      return sendJson(res, 422, { ok: false, message: 'Name, company, business email and product are required.' });
    }
    if (!isEmail(record.businessEmail)) return sendJson(res, 422, { ok: false, message: 'Enter a valid business email.' });
    if (record.phone && !isPhone(record.phone)) return sendJson(res, 422, { ok: false, message: 'Enter a valid phone number.' });
    await appendRecord('demo-requests.json', record);
    return sendJson(res, 201, { ok: true, id: record.id, message: 'Your demo request has been recorded.' });
  }

  if (url.pathname === '/api/consultation') {
    const record = makeRecord(payload, [
      ['name', 120], ['company', 140], ['businessEmail', 254], ['phone', 30],
      ['topic', 140], ['brief', 4000]
    ]);
    if (!record.name || !record.company || !record.businessEmail || !record.topic) {
      return sendJson(res, 422, { ok: false, message: 'Name, company, business email and consultation topic are required.' });
    }
    if (!isEmail(record.businessEmail)) return sendJson(res, 422, { ok: false, message: 'Enter a valid business email.' });
    if (record.phone && !isPhone(record.phone)) return sendJson(res, 422, { ok: false, message: 'Enter a valid phone number.' });
    await appendRecord('consultations.json', record);
    return sendJson(res, 201, { ok: true, id: record.id, message: 'Your consultation request has been recorded.' });
  }

  if (url.pathname === '/api/chat') {
    const record = makeRecord(payload, [
      ['name', 120], ['businessEmail', 254], ['company', 140], ['message', 3000]
    ]);
    if (!record.name || !record.businessEmail || !record.message) {
      return sendJson(res, 422, { ok: false, message: 'Name, business email and message are required.' });
    }
    if (!isEmail(record.businessEmail)) return sendJson(res, 422, { ok: false, message: 'Enter a valid business email.' });
    await appendRecord('chat-submissions.json', record);
    return sendJson(res, 201, { ok: true, id: record.id, message: 'Your message has been recorded.' });
  }

  if (url.pathname === '/api/resume') {
    const record = makeRecord(payload, [
      ['name', 120], ['email', 254], ['phone', 30], ['location', 160], ['primarySkill', 160],
      ['yearsExperience', 20], ['rightToWork', 160], ['linkedin', 500], ['fileName', 180], ['mimeType', 120]
    ]);
    if (!record.name || !record.email || !record.primarySkill || payload.consent !== true || !record.fileName || !payload.fileBase64) {
      return sendJson(res, 422, { ok: false, message: 'Name, email, primary skill, consent and CV are required.' });
    }
    if (!isEmail(record.email)) return sendJson(res, 422, { ok: false, message: 'Enter a valid email address.' });
    if (record.phone && !isPhone(record.phone)) return sendJson(res, 422, { ok: false, message: 'Enter a valid phone number.' });
    const ext = path.extname(record.fileName).toLowerCase();
    const allowedExt = new Set(['.pdf', '.doc', '.docx']);
    const allowedMime = new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
    if (!allowedExt.has(ext) || (record.mimeType && !allowedMime.has(record.mimeType))) {
      return sendJson(res, 415, { ok: false, message: 'CV must be a PDF, DOC or DOCX file.' });
    }
    let bytes;
    try {
      bytes = Buffer.from(String(payload.fileBase64), 'base64');
    } catch {
      return sendJson(res, 422, { ok: false, message: 'The CV file could not be read.' });
    }
    if (!bytes.length || bytes.length > MAX_RESUME_BYTES) return sendJson(res, 413, { ok: false, message: 'CV file must be 5 MB or smaller.' });
    await mkdir(UPLOAD_DIR, { recursive: true });
    const safeBase = path.basename(record.fileName, ext).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'cv';
    const storedFileName = `${record.id}-${safeBase}${ext}`;
    await writeFile(path.join(UPLOAD_DIR, storedFileName), bytes);
    const metadata = { ...record, consent: true, storedFileName, size: bytes.length };
    await appendRecord('resume-submissions.json', metadata);
    return sendJson(res, 201, { ok: true, id: record.id, message: 'Your CV has been uploaded.' });
  }

  if (url.pathname === '/api/login') {
    return sendJson(res, 501, {
      ok: false,
      code: 'AUTH_NOT_CONFIGURED',
      message: 'Portal authentication is intentionally not enabled in this build. Connect the approved identity provider before production.'
    });
  }

  return false;
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

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const apiHandled = await handleApi(req, res, url);
    if (apiHandled !== false) return;

    if (url.pathname.startsWith('/api/')) return sendJson(res, 404, { ok: false, message: 'API endpoint not found.' });

    const decodedPath = decodeURIComponent(url.pathname);
    const normalized = path.posix.normalize(decodedPath).replace(/^\.\.(\/|\\|$)/, '');
    const candidate = path.resolve(PUBLIC_DIR, '.' + normalized);
    if (!candidate.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, securityHeaders);
      return res.end('Forbidden');
    }

    if (path.extname(candidate) && await serveFile(res, candidate, true)) return;
    await serveFile(res, path.join(PUBLIC_DIR, 'index.html'), false);
  } catch (error) {
    const status = Number(error?.statusCode || 500);
    sendJson(res, status, { ok: false, message: status === 500 ? 'Unexpected server error.' : cleanText(error.message, 200) });
  }
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`RC IT Services running at http://localhost:${PORT}`);
  });
}

export { server };
