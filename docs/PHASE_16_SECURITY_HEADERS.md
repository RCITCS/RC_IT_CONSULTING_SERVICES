# Phase 16.9 — Security Headers / Cookies / Private Caching

## Review result

The administration stack already had strong private-response controls at both the Supabase renderer and Cloudflare gateway: no-store caching, noindex, nosniff, frame denial, strict referrer policy, restricted permissions, restrictive CSP, HSTS, COOP/CORP and host-only secure HttpOnly cookies.

Normal administrator session and CSRF cookies remain `Secure; HttpOnly; SameSite=Strict; Priority=High`. Recovery cookies remain `Secure; HttpOnly; SameSite=Lax; Priority=High` and path-scoped to `/reset-password` because recovery begins with a safe top-level navigation from an external mailbox.

## Concrete defect found and fixed

The Cloudflare admin gateway previously read every upstream administration response with `upstream.text()` before proxying it. That is valid for HTML rewriting but unsafe for private PDF/DOC/DOCX downloads because binary content can be corrupted by text decoding and re-encoding.

The gateway now:

- detects HTML from the upstream content type;
- decodes/rewrites only HTML responses;
- streams non-HTML response bodies unchanged;
- preserves private document content type/disposition and length semantics;
- applies `no-store, no-transform, max-age=0, must-revalidate` to every proxied admin response;
- reasserts no-cache, nosniff, no-referrer and same-origin resource policy at the Cloudflare boundary;
- keeps HTML CSP/frame/permissions/COOP/CORP protections intact.

The Supabase private document response itself remains attachment-only, no-store, nosniff, noindex, same-origin and sandboxed by CSP.

## Phase boundary

16.10 owns secret/configuration/logging review. No Phase-17 work is included.
