# RC IT Services — Production Domain Cutover Runbook

## Current authority

`rcitcs.com` is the public production identity. The Phase-17 source topology is:

| Hostname | Worker | Final role |
| --- | --- | --- |
| `rcitcs.com` | `rc-it-consulting-services` | canonical public production |
| `www.rcitcs.com` | `rc-it-consulting-services` | permanent canonical alias to apex |
| `admin.rcitcs.com` | `rcitcs-admin-production` | dedicated production administration |
| `admin-staging.rcitcs.com` | `rcitcs-admin-staging` | isolated staging hostname, intentionally unavailable after Phase 17 |

The authoritative RC IT Cloudflare control plane established by the Phase-17.1 audit is account `3fdd024f6fbc25c03ed4481352576540`, zone `cf815244b9dbd51a490747f597867c68`.

The separate Cloudflare GitHub-App build named `rcitcservices` in account `20d349f3f75ab611adb3f987188636e7` is not RC IT production authority. A green check from that integration is not evidence that `rcitcs.com` was deployed.

## Source-controlled deployment targets

Canonical Wrangler configurations are:

- `wrangler.jsonc` → `rc-it-consulting-services`
- `wrangler.admin-production.jsonc` → `rcitcs-admin-production`
- `wrangler.admin-staging.jsonc` → `rcitcs-admin-staging`

All three disable `workers.dev` and preview URLs. Company hostnames are Custom Domains; legacy overlapping Worker Routes are not part of the target topology.

## Canonical request behavior

- `http://rcitcs.com/*` → permanent HTTPS redirect.
- `https://www.rcitcs.com/*` → `308` to the same path/query on `https://rcitcs.com`.
- public `GET/HEAD /admin*` → `308` to `https://admin.rcitcs.com`.
- public `/admin*` mutations → fail closed, no credential replay or proxy.
- `admin.rcitcs.com` must return the `X-RC-Admin-Environment: production` ownership marker.
- `admin-staging.rcitcs.com` must return the intentional `503` staging-unavailable state and staging ownership marker after cutover.
- public `workers.dev` must not remain a live production website endpoint.

## Email DNS boundary

Existing working mail records are preserved:

- Cloudflare Email Routing apex MX and SPF;
- Resend DKIM at `resend._domainkey`;
- Resend/Amazon SES return-path MX/SPF at `send`;
- Resend tracking CNAME at `links`.

Phase 17 additionally requires one DMARC TXT record at `_dmarc.rcitcs.com`:

`v=DMARC1; p=none; rua=mailto:dmarc@rcitcs.com; adkim=s; aspf=s; pct=100`

The `p=none` policy is monitoring-only. Do not replace working MX/SPF/DKIM records while adding DMARC.

## Final cutover sequence

1. Require the exact Phase-17 branch head to be fully green.
2. Ensure the DMARC requirement is publicly resolvable.
3. Merge PR #85 using the exact verified head SHA only.
4. Mirror primary `main` to `RCITCS/RC_IT_CONSULTING_SERVICES` and require identical `main` SHA.
5. Allow the authoritative RC IT Cloudflare builds/deployment path to converge all three canonical Worker targets.
6. Prove the exact merged SHA on `https://rcitcs.com`.
7. Prove public/www/admin/staging/alternate-origin runtime boundaries.
8. Prove email DNS remains intact and DMARC is present.
9. Run Supabase Security Advisor and require no unresolved release-blocking security finding.
10. Record the final evidence in the Phase-17.16 closure document.

## Safety rules

- Do not transfer RC IT domains or secrets into the unrelated account solely to satisfy a green GitHub check.
- Do not delete historical DNS or Worker routes without dependency/ownership proof.
- Do not treat branch builds as production activation.
- Do not declare Phase 17 closed from compile success, Wrangler dry-run, or PR CI alone.
- Do not delete/disconnect the stale cross-account Cloudflare integration until its unrelated workload ownership is understood.
