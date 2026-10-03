import assert from 'node:assert/strict';
import fs from 'node:fs';
import { attachmentPreview, ATTACHMENT_PREVIEW_SCRIPT } from '../supabase/functions/admin-auth/contact-attachment-preview.js';
import { proxyAdminResponse } from '../src/backend/runtime/worker.js';

assert.deepEqual(attachmentPreview('photo.jpeg', 'image/jpeg'), { kind: 'image', contentType: 'image/jpeg' });
assert.deepEqual(attachmentPreview('report.pdf', 'application/pdf'), { kind: 'pdf', contentType: 'application/pdf' });
assert.deepEqual(attachmentPreview('voice.mp3', 'audio/mpeg'), { kind: 'audio', contentType: 'audio/mpeg' });
assert.deepEqual(attachmentPreview('clip.mp4', 'video/mp4'), { kind: 'video', contentType: 'video/mp4' });
assert.deepEqual(attachmentPreview('notes.txt', 'text/plain'), { kind: 'text', contentType: 'text/plain; charset=utf-8' });
assert.equal(attachmentPreview('report.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document').kind, 'document');
assert.equal(attachmentPreview('budget.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').kind, 'spreadsheet');
assert.equal(attachmentPreview('archive.xls', 'application/vnd.ms-excel').kind, 'spreadsheet');
for (const [name, mime] of [
  ['active.svg', 'image/svg+xml'], ['page.html', 'text/html'],
  ['fake.jpg', 'text/html'], ['fake.html', 'image/jpeg'], ['file', '__proto__'],
  ['document.doc', 'application/msword']
]) {
  assert.equal(attachmentPreview(name, mime).kind, 'file');
}

const contacts = fs.readFileSync(new URL('../supabase/functions/admin-auth/contacts.ts', import.meta.url), 'utf8');
assert.match(contacts, /data-attachment-preview/);
assert.match(contacts, /contact-attachment-dialog/);
assert.match(contacts, /content-disposition.*inline/);
assert.match(contacts, /wantsPreview \? preview\.contentType : "application\/octet-stream"/);
assert.match(contacts, /type="file" multiple/);
assert.match(contacts, /files\.length > MAX_ATTACHMENTS/);
assert.match(contacts, /MAX_ATTACHMENTS = 5/);
assert.match(contacts, /preview-library/);
assert.match(ATTACHMENT_PREVIEW_SCRIPT, /mammoth\.extractRawText/);
assert.match(ATTACHMENT_PREVIEW_SCRIPT, /XLSX\.read/);
assert.match(ATTACHMENT_PREVIEW_SCRIPT, /td\.textContent/);
assert.match(ATTACHMENT_PREVIEW_SCRIPT, /dialog\.showModal\(\)/);
assert.match(ATTACHMENT_PREVIEW_SCRIPT, /downloadUrl\.searchParams\.set\('download', '1'\)/);
const previewPage = new Response('<!doctype html><html><body><dialog id="contact-attachment-dialog"></dialog></body></html>', { headers: { 'content-type': 'text/html' } });
const proxiedPreview = await proxyAdminResponse(previewPage, 'GET', '');
for (const directive of ["img-src 'self'", "media-src 'self'", "frame-src 'self'", "connect-src 'self'"]) {
  assert.ok(proxiedPreview.headers.get('content-security-policy')?.includes(directive), `Contact preview needs ${directive} after the Cloudflare proxy`);
}
const ordinaryPage = new Response('<!doctype html><html><body>Admin</body></html>', { headers: { 'content-type': 'text/html' } });
const proxiedOrdinary = await proxyAdminResponse(ordinaryPage, 'GET', '');
assert.ok(!proxiedOrdinary.headers.get('content-security-policy')?.includes('img-src'), 'Other admin pages retain their stricter policy');
console.log('Contact attachment preview, safe media types, explicit download and multiple-file composer checks passed.');
