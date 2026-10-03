import assert from 'node:assert/strict';
import { handleContactEmail } from '../worker/contact-inbound.js';
import { createResendEmailProvider } from '../supabase/functions/_shared/resend-email-provider.js';

const destination = 'rcitcservices@gmail.com';
const raw = new TextEncoder().encode('From: customer@example.com\r\nTo: contact@rcitcs.com\r\nSubject: Test\r\n\r\nHello');

for (const captureFails of [false, true]) {
  const forwarded = [];
  const pending = [];
  const message = {
    to: 'contact@rcitcs.com',
    rawSize: raw.length,
    raw: captureFails ? new ReadableStream({ start(controller) { controller.error(new Error('capture failed')); } }) : raw,
    async forward(address) { forwarded.push(address); }
  };
  const oldFetch = globalThis.fetch;
  let copied = 0;
  globalThis.fetch = async (_url, init) => {
    copied += 1;
    assert.equal(init.headers['x-rcitcs-mail-recipient'], 'contact@rcitcs.com');
    return new Response('{}', { status: 200 });
  };
  try {
    await handleContactEmail(message, { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'test' }, { waitUntil(promise) { pending.push(promise); } });
    await Promise.all(pending);
  } finally {
    globalThis.fetch = oldFetch;
  }
  assert.deepEqual(forwarded, [destination], 'Gmail forwarding must survive admin-copy capture failure');
  assert.equal(copied, captureFails ? 0 : 1);
}

let delivered = null;
let retrieved = false;
const provider = createResendEmailProvider({
  apiKey: 'test',
  fetchImpl: async (url, init) => {
    if (init.headers.authorization && !init.method) {
      retrieved = true;
      assert.equal(url, 'https://api.resend.com/emails/11111111-1111-4111-8111-111111111111');
      return new Response(JSON.stringify({ message_id: '<prior@example.com>' }), { status: 200 });
    }
    delivered = JSON.parse(init.body);
    return new Response(JSON.stringify({ id: 'email-id' }), { status: 200 });
  }
});
assert.equal(await provider.messageId('11111111-1111-4111-8111-111111111111'), '<prior@example.com>');
assert.equal(retrieved, true);
await provider.send({
  from: 'RC IT Services <contact@rcitcs.com>', to: 'customer@example.com',
  subject: 'Reply', html: '<p>Reply</p>', text: 'Reply',
  idempotencyKey: 'contact-conversation-test',
  attachments: [{ filename: 'example.pdf', content: 'SGVsbG8=' }],
  headers: { 'In-Reply-To': '<prior@example.com>', References: '<prior@example.com>' }
});
assert.deepEqual(delivered.attachments, [{ filename: 'example.pdf', content: 'SGVsbG8=' }]);
assert.deepEqual(delivered.headers, { 'In-Reply-To': '<prior@example.com>', References: '<prior@example.com>' });
console.log('Contact Gmail forwarding, capture failure isolation and email attachment delivery passed.');
