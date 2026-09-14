import { EMAIL_IDENTITIES, EMAIL_TEMPLATE_KEYS, emailIdempotencyKey, requireEmail } from './email-contract.js';
import { ADMIN_ORIGIN, adminPasswordResetTemplate } from './email-templates.js';
import { EmailProviderError } from './resend-email-provider.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ADMIN_EMAIL = 'rcitcservices@gmail.com';
export const ADMIN_RESET_TTL_MINUTES = 30;

function text(value) {
  return String(value ?? '').trim();
}

function safeError(error) {
  if (error instanceof EmailProviderError) {
    return {
      code: text(error.code) || 'EMAIL_PROVIDER_ERROR',
      message: 'Transactional email provider rejected or could not complete the password-reset email.'
    };
  }
  return {
    code: 'ADMIN_RESET_DELIVERY_FAILED',
    message: 'Administrator password-reset email delivery failed.'
  };
}

export function validateAdminResetQueue(queue) {
  if (!queue || typeof queue !== 'object') throw new TypeError('Queued email record is required.');
  const id = text(queue.id);
  if (!UUID.test(id)) throw new TypeError('Queued email id is invalid.');
  if (queue.template_key !== EMAIL_TEMPLATE_KEYS.ADMIN_PASSWORD_RESET) throw new TypeError('Queued email template is not an administrator password reset.');
  if (text(queue.status) !== 'sending') throw new TypeError('Queued email must be atomically claimed before dispatch.');
  if (text(queue.provider) !== 'resend') throw new TypeError('Queued email provider is not supported.');
  if (text(queue.sender_email).toLowerCase() !== EMAIL_IDENTITIES.noreply.address) throw new TypeError('Queued email sender is not approved.');
  const recipient = requireEmail(queue.recipient_email, 'recipient_email');
  if (recipient !== ADMIN_EMAIL) throw new TypeError('Administrator password reset recipient is not approved.');
  const metadata = queue.metadata && typeof queue.metadata === 'object' ? queue.metadata : {};
  const adminId = text(metadata.admin_id);
  const resetRequestId = text(metadata.reset_request_id);
  if (!UUID.test(adminId) || !UUID.test(resetRequestId)) throw new TypeError('Administrator reset metadata is incomplete.');
  const expectedIdempotencyKey = emailIdempotencyKey(
    EMAIL_TEMPLATE_KEYS.ADMIN_PASSWORD_RESET,
    'password_reset_request',
    resetRequestId
  );
  if (text(queue.idempotency_key) !== expectedIdempotencyKey) throw new TypeError('Administrator reset idempotency key does not match the queued event.');
  return Object.freeze({ id, adminId, resetRequestId, recipient, expectedIdempotencyKey });
}

export async function dispatchAdminPasswordReset({
  queue,
  provider,
  createResetToken,
  markSent,
  markFailed,
  randomToken,
  shaHex,
  now = () => Date.now()
} = {}) {
  const state = validateAdminResetQueue(queue);
  if (!provider || typeof provider.send !== 'function') throw new TypeError('Email provider is required.');
  if (typeof createResetToken !== 'function' || typeof markSent !== 'function' || typeof markFailed !== 'function') {
    throw new TypeError('Password-reset delivery persistence callbacks are required.');
  }
  if (typeof randomToken !== 'function' || typeof shaHex !== 'function') throw new TypeError('Password-reset token helpers are required.');

  try {
    const rawToken = text(await randomToken());
    if (rawToken.length < 32 || rawToken.length > 256) throw new Error('Generated reset token is outside the allowed length.');
    const tokenHash = text(await shaHex(rawToken));
    if (!/^[a-f0-9]{64}$/i.test(tokenHash)) throw new Error('Generated reset token hash is invalid.');
    const expiresAt = new Date(Number(now()) + ADMIN_RESET_TTL_MINUTES * 60_000).toISOString();
    const tokenCreated = await createResetToken({
      adminId: state.adminId,
      tokenHash,
      expiresAt
    });
    if (!tokenCreated) throw new Error('Reset token could not be created.');

    const resetUrl = `${ADMIN_ORIGIN}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const envelope = adminPasswordResetTemplate({
      resetRequestId: state.resetRequestId,
      adminEmail: state.recipient,
      resetUrl,
      expiresMinutes: ADMIN_RESET_TTL_MINUTES
    });
    if (envelope.idempotencyKey !== state.expectedIdempotencyKey) throw new Error('Reset email idempotency contract mismatch.');

    const result = await provider.send(envelope);
    if (!result?.providerMessageId) throw new Error('Email provider returned no message id.');
    const persisted = await markSent({
      emailLogId: state.id,
      providerMessageId: result.providerMessageId
    });
    if (!persisted) throw new Error('Sent reset email could not be recorded.');

    return Object.freeze({
      ok: true,
      emailLogId: state.id,
      provider: result.provider,
      providerMessageId: result.providerMessageId
    });
  } catch (error) {
    const failure = safeError(error);
    try {
      await markFailed({
        emailLogId: state.id,
        errorCode: failure.code,
        errorMessage: failure.message,
        retryAt: null
      });
    } catch {
      // Preserve the original failure. The outer dispatcher records only a generic response.
    }
    throw error;
  }
}

export { ADMIN_EMAIL };
