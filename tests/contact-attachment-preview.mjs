import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
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
assert.match(ATTACHMENT_PREVIEW_SCRIPT, /URL\.createObjectURL\(new Blob\(\[bytes\], \{ type: 'application\/pdf' \}\)\)/);
assert.match(ATTACHMENT_PREVIEW_SCRIPT, /URL\.revokeObjectURL/);
assert.match(ATTACHMENT_PREVIEW_SCRIPT, /signature\.includes\('%PDF-'\)/);
assert.doesNotMatch(ATTACHMENT_PREVIEW_SCRIPT, /setAttribute\('sandbox'/);
assert.match(ATTACHMENT_PREVIEW_SCRIPT, /dialog\.showModal\(\)/);
assert.match(ATTACHMENT_PREVIEW_SCRIPT, /downloadUrl\.searchParams\.set\('download', '1'\)/);
const previewPage = new Response('<!doctype html><html><body><dialog id="contact-attachment-dialog"></dialog></body></html>', { headers: { 'content-type': 'text/html' } });
const proxiedPreview = await proxyAdminResponse(previewPage, 'GET', '');
for (const directive of ["img-src 'self'", "media-src 'self'", "frame-src 'self'", "connect-src 'self'"]) {
  assert.ok(proxiedPreview.headers.get('content-security-policy')?.includes(directive), `Contact preview needs ${directive} after the Cloudflare proxy`);
}
assert.ok(proxiedPreview.headers.get('content-security-policy')?.includes("frame-src 'self' blob:"), 'The contact page must permit its local PDF blob frame');
const ordinaryPage = new Response('<!doctype html><html><body>Admin</body></html>', { headers: { 'content-type': 'text/html' } });
const proxiedOrdinary = await proxyAdminResponse(ordinaryPage, 'GET', '');
assert.ok(!proxiedOrdinary.headers.get('content-security-policy')?.includes('img-src'), 'Other admin pages retain their stricter policy');

class FakeElement {
  constructor(tagName = 'div') { this.tagName = tagName; this.children = []; this.dataset = {}; this.listeners = {}; }
  append(child) { this.children.push(child); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(name, handler) { this.listeners[name] = handler; }
  setAttribute(name, value) { this[name] = value; }
  closest(selector) { return selector === 'a[data-attachment-preview]' ? this : null; }
  focus() {}
}
const stage = new FakeElement();
const close = new FakeElement('button');
const dialog = new FakeElement('dialog');
dialog.querySelector = () => close;
dialog.showModal = () => { dialog.open = true; };
dialog.close = () => { dialog.open = false; dialog.listeners.close?.(); };
const nodes = new Map([
  ['contact-attachment-dialog', dialog], ['contact-attachment-stage', stage],
  ['contact-attachment-title', new FakeElement('h2')], ['contact-attachment-download', new FakeElement('a')]
]);
const documentListeners = {};
const document = {
  currentScript: { src: 'https://admin.example/contacts/attachments-preview.js' },
  getElementById: (id) => nodes.get(id) || null,
  createElement: (tag) => new FakeElement(tag),
  addEventListener: (name, handler) => { documentListeners[name] = handler; }
};
const revoked = [];
class PreviewUrl extends URL {
  static createObjectURL() { return 'blob:https://admin.example/pdf-test'; }
  static revokeObjectURL(url) { revoked.push(url); }
}
const pdfResponse = new Response(new Blob(['%PDF-1.7\npreview test'], { type: 'application/pdf' }));
vm.runInNewContext(ATTACHMENT_PREVIEW_SCRIPT, {
  document, Element: FakeElement, URL: PreviewUrl, TextDecoder, Blob,
  fetch: async () => pdfResponse, location: { href: 'https://admin.example/contacts/test' }
});
const pdfLink = new FakeElement('a');
pdfLink.href = 'https://admin.example/contacts/test/attachments/sample?preview=1';
pdfLink.dataset = { attachmentPreview: '', previewKind: 'pdf', filename: 'sample.pdf' };
documentListeners.click({ target: pdfLink, preventDefault() {} });
await new Promise(setImmediate);
assert.equal(stage.children[0]?.tagName, 'iframe', 'An authenticated PDF should render inside the preview window');
assert.equal(stage.children[0]?.src, 'blob:https://admin.example/pdf-test', 'The PDF frame must use a local browser blob rather than a sandboxed server page');
assert.equal(stage.children[0]?.sandbox, undefined);
dialog.close();
assert.deepEqual(revoked, ['blob:https://admin.example/pdf-test'], 'Closing preview must release private PDF bytes');
console.log('Contact attachment preview, safe media types, explicit download and multiple-file composer checks passed.');
