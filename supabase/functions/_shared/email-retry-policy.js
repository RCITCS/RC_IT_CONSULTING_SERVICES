import { EMAIL_TEMPLATE_KEYS } from './email-contract.js';
import { EmailProviderError } from './resend-email-provider.js';

const RETRY_DELAYS_MINUTES = Object.freeze([5, 15, 60, 360]);
export const MAX_TRANSACTIONAL_EMAIL_ATTEMPTS = 5;

export function retryAtForEmailFailure({ templateKey, attemptCount, error, now = () => Date.now() } = {}) {
  if (templateKey === EMAIL_TEMPLATE_KEYS.ADMIN_PASSWORD_RESET) return null;
  if (!(error instanceof EmailProviderError) || error.retryable !== true) return null;
  const attempt = Math.max(1, Number(attemptCount) || 1);
  if (attempt >= MAX_TRANSACTIONAL_EMAIL_ATTEMPTS) return null;
  const minutes = RETRY_DELAYS_MINUTES[Math.min(attempt - 1, RETRY_DELAYS_MINUTES.length - 1)];
  return new Date(Number(now()) + minutes * 60_000).toISOString();
}

export function retryDelayMinutesForAttempt(attemptCount) {
  const attempt = Math.max(1, Number(attemptCount) || 1);
  if (attempt >= MAX_TRANSACTIONAL_EMAIL_ATTEMPTS) return null;
  return RETRY_DELAYS_MINUTES[Math.min(attempt - 1, RETRY_DELAYS_MINUTES.length - 1)];
}
