# Phase 16.10 — Secrets / Configuration / Sensitive Logging Review

## Review result

The production runtime keeps secret material outside source control. Supabase-facing server runtimes read managed `SUPABASE_SECRET_KEYS` first and retain `SUPABASE_SERVICE_ROLE_KEY` only as a compatibility fallback. Transactional email reads `RESEND_API_KEY` from runtime secret storage.

No runtime secret is rendered into administration HTML, returned in API errors, inserted into audit metadata, or written through console/debug logging.

## Provider and database failures

- Database/provider failures fail closed rather than falling back to browser authority.
- External administration errors remain generic.
- Resend provider rejection/network/timeout handling exposes stable internal error classes/codes without returning provider payloads or credentials to end users.
- Candidate preview HMAC material stays server-side; the browser receives only the proof.
- Server-to-server authorization headers are assembled only at outbound provider/database request boundaries.

## Repository regression guard

The Phase 16.10 test recursively scans sensitive runtime source directories for credential-like literals and private-key blocks, rejects console logging in Supabase Edge runtimes, verifies environment-secret authority and checks that the GitHub secret-availability workflow reports boolean presence only.

The test deliberately does not remove the legacy Supabase service-key fallback because current Supabase-managed Edge environments may still supply that compatibility variable. Modern managed secret keys remain preferred whenever available.

## Phase boundary

16.11 owns dependency and supply-chain review. Secret rotation itself remains an operational credential-management action and is not simulated in source or acceptance tests.
