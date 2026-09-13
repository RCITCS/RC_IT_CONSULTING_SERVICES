import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ADMIN_EMAIL,
  ADMIN_RESET_TTL_MINUTES,
  dispatchAdminPasswordReset,
  validateAdminResetQueue
} from '../supabase/functions/_shared/admin-password-reset-delivery.js';
import { EMAIL_IDENTITIES, EMAIL_TEMPLATE_KEYS, emailIdempotencyKey } from '../supabase/functions/_shared/email-contract.js';
import { EmailProviderError } from '../supabase/functions/_shared/resend-email-provider.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const emailLogId = '11111111-1111-4111-8111-111111111111';
const adminId = '22222222-2222-4222-8222-222222222222';
const resetRequestId = '33333333-3333-4333-8333-333333333333';
const idempotencyKey = emailIdempotencyKey(
  EMAIL_TEMPLATE_KEYS.ADMIN_PASSWORD_RESET,
  'password_reset_request',
  resetRequestId
);
const queue = {
  id: emailLogId,
  provider: 'resend',
  template_key: EMAIL_TEMPLATE_KEYS.ADMIN_PASSWORD_RESET,
  recipient_email: ADMIN_EMAIL,
  sender_email: EMAIL_IDENTITIES.noreply.address,
  status: 'sending',
  idempotency_key: idempotencyKey,
  metadata: { admin_id: adminId, reset_request_id: resetRequestId }
};

const validated = validateAdminResetQueue(queue);
assert.equal(validated.adminId, adminId);
assert.equal(validated.resetRequestId, resetRequestId);
assert.throws(() => validateAdminResetQueue({ ...queue, status: 'queued' }), /atomically claimed/);
assert.throws(() => validateAdminResetQueue({ ...queue, recipient_email: 'attacker@example.com' }), /recipient is not approved/);
assert.throws(() => validateAdminResetQueue({ ...queue, sender_email: 'career@rcitcs.com' }), /sender is not approved/);
assert.throws(() => validateAdminResetQueue({ ...queue, idempotency_key: 'wrong' }), /idempotency key/);

const rawToken = 'a'.repeat(43);
const tokenHash = 'b'.repeat(64);
let tokenInput = null;
let sentEnvelope = null;
let sentPersisted = null;
let failedPersisted = null;
const nowMs = Date.parse('2026-09-13T20:00:00Z');

const success = await dispatchAdminPasswordReset({
  queue,
  provider: {
    async send(envelope) {
      sentEnvelope = envelope;
      return { provider: 'resend', providerMessageId: 'msg_reset_123' };
    }
  },
  async createResetToken(input) {
    tokenInput = input;
    return true;
  },
  async markSent(input) {
    sentPersisted = input;
    return true;
  },
  async markFailed(input) {
    failedPersisted = input;
    return true;
  },
  async randomToken() { return rawToken; },
  async shaHex(value) {
    assert.equal(value, rawToken);
    return tokenHash;
  },
  now: () => nowMs
});

assert.equal(success.ok, true);
assert.equal(tokenInput.adminId, adminId);
assert.equal(tokenInput.tokenHash, tokenHash);
assert.equal(tokenInput.expiresAt, new Date(nowMs + ADMIN_RESET_TTL_MINUTES * 60_000).toISOString());
assert.equal(sentEnvelope.to, ADMIN_EMAIL);
assert.equal(sentEnvelope.from, EMAIL_IDENTITIES.noreply.from);
assert.equal(sentEnvelope.idempotencyKey, idempotencyKey);
assert.ok(sentEnvelope.text.includes('/reset-password?token='));
assert.ok(sentEnvelope.text.includes(encodeURIComponent(rawToken)));
assert.equal(sentPersisted.emailLogId, emailLogId);
assert.equal(sentPersisted.providerMessageId, 'msg_reset_123');
assert.equal(failedPersisted, null);

failedPersisted = null;
await assert.rejects(
  dispatchAdminPasswordReset({
    queue,
    provider: {
      async send() {
        throw new EmailProviderError('rate limited', { code: 'rate_limit_exceeded', retryable: true, status: 429 });
      }
    },
    async createResetToken() { return true; },
    async markSent() { return true; },
    async markFailed(input) { failedPersisted = input; return true; },
    async randomToken() { return rawToken; },
    async shaHex() { return tokenHash; },
    now: () => nowMs
  }),
  (error) => error instanceof EmailProviderError && error.code === 'rate_limit_exceeded'
);
assert.equal(failedPersisted.emailLogId, emailLogId);
assert.equal(failedPersisted.errorCode, 'rate_limit_exceeded');
assert.equal(failedPersisted.retryAt, null, 'Reset links must not be automatically retried with regenerated secrets.');
assert.ok(!failedPersisted.errorMessage.includes('rate limited'));

const migration = await readFile(path.join(root, 'supabase/migrations/20260913211500_phase_13_password_reset_delivery.sql'), 'utf8');
assert.match(migration, /'sending'::text/);
assert.match(migration, /create or replace function public\.claim_transactional_email/i);
assert.match(migration, /status = 'sending'/i);
assert.match(migration, /attempt_count = attempt_count \+ 1/i);
assert.match(migration, /grant execute on function public\.claim_transactional_email\(uuid\) to service_role/i);
assert.match(migration, /revoke execute on function public\.claim_transactional_email\(uuid\) from public, anon, authenticated/i);

const dispatcher = await readFile(path.join(root, 'supabase/functions/transactional-email/index.ts'), 'utf8');
assert.match(dispatcher, /Deno\.env\.get\("RESEND_API_KEY"\)/);
assert.match(dispatcher, /providerConfigured: provider\.configured/);
assert.match(dispatcher, /internalAuthorized/);
assert.match(dispatcher, /claim_transactional_email/);
assert.match(dispatcher, /create_admin_password_reset_token/);
assert.match(dispatcher, /p_requested_ip_hash:\s*null/);
assert.match(dispatcher, /typeof result === "string"/);
assert.match(dispatcher, /UUID\.test\(result\)/);
assert.match(dispatcher, /dispatchAdminPasswordReset/);
assert.ok(!dispatcher.includes('console.log'));
assert.ok(!dispatcher.includes('RESEND_API_KEY = "re_'));

const adminDb = await readFile(path.join(root, 'supabase/functions/admin-auth/db.ts'), 'utf8');
assert.match(adminDb, /rpc\/enqueue_transactional_email/);
assert.match(adminDb, /functions\/v1\/transactional-email\/dispatch/);
assert.match(adminDb, /crypto\.randomUUID\(\)/);
assert.match(adminDb, /EMAIL_IDENTITIES\.noreply\.address/);
assert.match(adminDb, /token_generation: "at_send_time"/);
assert.ok(!adminDb.includes('rest("email_logs"'));
assert.ok(!adminDb.includes('RESEND_API_KEY'));

console.log('Phase 13 administrator password-reset delivery, single-use token, runtime RPC contract, no-auto-retry and dispatcher security checks passed.');
