# Admin authentication Edge Function

This function is the Phase-9 private administrator authentication surface. It owns sign-in, server-side sessions, logout, password change, password-reset acceptance, throttling, CSRF enforcement, security headers and authentication audit events.

It intentionally contains no dashboard metrics, job management or candidate-management behavior.

## Runtime secrets

Supabase provides the project URL and server API keys to Edge Functions. The function prefers the modern SUPABASE_SECRET_KEYS value and retains legacy SUPABASE_SERVICE_ROLE_KEY compatibility.

An administrator whose database password hash has not yet been initialized also requires ADMIN_BOOTSTRAP_PASSWORD_VERIFIER. This value is a runtime secret with the format:

pbkdf2-sha256:600000:<base64url-salt>:<base64url-derived-key>

Never commit its value. After the first successful bootstrap login, the submitted password is stored only as a SHA-256-prehashed bcrypt value through the service-role-only database function. Normal logins no longer use the bootstrap verifier once admins.password_hash is populated.

## Deployment boundary

The function is configured with verify_jwt = false because it is a browser-facing HTML authentication endpoint with its own opaque, hashed server-session contract. Database access still requires the server-only Supabase secret key. Browser roles have no direct table or authentication-RPC access.
