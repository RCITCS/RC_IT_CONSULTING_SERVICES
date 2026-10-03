import assert from 'node:assert/strict';
import fs from 'node:fs';
import { attachmentPreview, ATTACHMENT_PREVIEW_SCRIPT } from '../supabase/functions/admin-auth/contact-attachment-preview.js';

assert.deepEqual(attachmentPreview('photo.jpeg', 'image/jpeg'), { kind: 'image', contentType: 'image/jpeg' });
assert.deepEqual(attachmentPreview('report.pdf', 'application/pdf'), { kind: 'pdf', contentType: 'application/pdf' });
assert.deepEqual(attachmentPreview('voice.mp3', 'audio/mpeg'), { kind: 'audio', contentType: 'audio/mpeg' });
assert.deepEqual(attachmentPreview('clip.mp4', 'video/mp4'), { kind: 'video', contentType: 'video/mp4' });
for (const [name, mime] of [
  ['active.svg', 'image/svg+xml'], ['page.html', 'text/html'],
  ['fake.jpg', 'text/html'], ['fake.html', 'image/jpeg'], ['file', '__proto__'],
  ['document.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
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
assert.match(ATTACHMENT_PREVIEW_SCRIPT, /dialog\.showModal\(\)/);
assert.match(ATTACHMENT_PREVIEW_SCRIPT, /downloadUrl\.searchParams\.set\('download', '1'\)/);
console.log('Contact attachment preview, safe media types, explicit download and multiple-file composer checks passed.');
