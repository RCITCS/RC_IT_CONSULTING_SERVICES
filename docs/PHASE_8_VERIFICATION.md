# Phase 8 Verification — Database and Storage Architecture

## Status

`IMPLEMENTATION VERIFIED — LIVE SUPABASE ACTIVATION PENDING`

Phase 8 code is complete, reviewed and regression-tested. The phase is not marked `COMPLETED & VERIFIED` until the approved hosted Supabase project has the migrations applied, the private candidate-document bucket provisioned, the server secret configured in the production Worker, and live persistence/storage behavior exercised.

## Implementation evidence

- final reviewed implementation head before documentation: `14bdd714db97ae19a8301952591bcd6601328c11`
- PR: `#9 — Phase 8: database and private storage architecture`
- GitHub Actions run: `34268359392` (run #127)
- architecture/build/test job: passed
- Cloudflare branch build: passed
- Cloudflare preview version: `dd4b347d-8506-4752-bf0b-1c2cb8c7a07d`
- 158 prerender routes remained green
- 65 production-indexing-eligible URLs remained green
- 46 job routes remained search-gated
- main JS remained 2.3 KiB gzip
- global CSS remained 13.2 KiB gzip
- combined initial JS + global CSS remained 15.5 KiB gzip

## Database contracts verified

The reproducible Supabase migrations define 13 private application data domains:

1. admins
2. sessions
3. password reset tokens
4. job categories
5. jobs
6. applications
7. application documents
8. application history
9. contact enquiries
10. candidate messages
11. notifications
12. email logs
13. audit logs

All private application tables enable RLS. Browser-facing `anon` and `authenticated` table grants are revoked and elevated database access remains server-side.

## Storage contracts verified

- candidate bucket is private
- PDF, DOC and DOCX are the only approved document families
- 20 MiB maximum is enforced per document
- extension, MIME and content signatures are checked
- DOCX must include Word package markers rather than only a ZIP signature
- user filenames never become object keys
- object keys use `applications/<application-uuid>/documents/<document-uuid>.<ext>`
- Postgres document metadata independently constrains the same namespace
- storage provider independently revalidates path/MIME/content before upload
- private retrieval uses short-lived signed URLs only
- signed URL expiry is constrained to 30–900 seconds
- no public document URL is introduced

## Supabase credential contracts verified

- new `sb_secret_...` server keys are accepted
- `sb_publishable_...` browser keys are rejected for server persistence
- legacy service-role JWTs remain migration-compatible
- legacy anonymous JWTs are rejected
- current secret keys are sent through the Supabase `apikey` header and are not incorrectly treated as Bearer JWTs
- legacy service-role JWT compatibility remains isolated to server-side HTTP behavior
- frontend source is scanned to prevent elevated Supabase credential references

## Public enquiry persistence

When Supabase is configured, contact/demo/consultation/chat records flow through the Phase 7 service/repository boundary into `contact_enquiries`. `201` is returned only when Postgres confirms the same generated record ID. Contact privacy-consent timestamp evidence is retained.

When Supabase is not configured, the application continues to return truthful persistence-unavailable behavior rather than fake success.

## Review defects found and corrected

1. Storage upload initially relied too heavily on the future caller for MIME/path validation. The provider now enforces those rules independently.
2. Initial DOCX identification could accept arbitrary ZIP files. Word package markers are now required.
3. Initial Supabase HTTP behavior treated new secret keys as Bearer JWTs. Current secret keys now use `apikey`; legacy service-role JWT behavior is handled separately.
4. Contact consent acceptance originally lacked explicit timestamp evidence in durable storage. `privacy_consent_at` was added.
5. Database document metadata originally did not independently enforce the generated private-object namespace. A schema constraint now mirrors storage path rules.
6. Independent hardening tests were added so negative-test state cannot mask failures.

## Multi-role review

- **Product Owner:** durable contact/candidate/admin data domains support the planned business workflows without enabling unfinished later-phase features.
- **Solution Architect:** persistence remains behind the Phase 7 provider/repository boundaries; Cloudflare, Node and Vercel adapters retain one backend authority.
- **Frontend:** no visual, navigation or route-flow changes introduced.
- **Backend:** normalized writes, confirmed persisted IDs, explicit provider failure behavior and schema constraints verified.
- **QA:** positive and negative persistence/storage tests plus all prior route/render/design/SEO/performance regressions passed.
- **Security:** browser keys rejected for elevated access, private documents isolated, no public storage URLs, bounded signed URLs, generated object keys, RLS and browser-role revocation verified.
- **SEO:** Phase 6 indexing model unchanged; 158 prerender routes and 65 eligible sitemap URLs remain green.
- **Performance:** no frontend payload regression; 15.5 KiB initial JS/global CSS budget unchanged.
- **End User:** no fake persistence success; current production behavior remains truthful until hosted persistence is activated.
- **Admin User:** future authorized retrieval is supported through signed private URLs without exposing direct storage paths publicly.

## Hosted activation gate

The approved hosted Supabase project now exists, but this execution environment does not currently have an authenticated Supabase connector/session capable of applying SQL or provisioning the hosted bucket. The Supabase integration should be connected to complete this gate without placing credentials in source control.

Before final Phase 8 closure, verify all of the following against the hosted project:

1. both Phase 8 SQL migrations apply successfully
2. all 13 tables exist with RLS enabled
3. browser roles cannot access private tables
4. `candidate-documents` exists and is private
5. bucket limit is 20 MiB and allowed MIME types match the application contract
6. production Worker has `SUPABASE_URL`, `SUPABASE_STORAGE_BUCKET` and server-only `SUPABASE_SECRET_KEY`
7. a controlled test enquiry persists and returns the confirmed database ID
8. a controlled private test document uploads through the provider
9. a short-lived signed retrieval URL works
10. the test records/object are removed after verification if not needed

Phase 9 must not begin until this hosted activation gate is closed and this document is updated to `COMPLETED & VERIFIED`.
