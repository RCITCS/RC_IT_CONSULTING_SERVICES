# Phase 17.8 — DNS Record Cleanup and Conflict Elimination

Status: **IMPLEMENTED — exact-head verification pending**

Depends on: Phase 17.7 closure SHA `214e0f45b2d5f222b8728a6ed9888b71fb9aa12e`.

## Objective

Converge the RC IT web-host DNS surface so every web hostname has exactly one intended Cloudflare Worker/Custom-Domain owner and no stale web-host pointer competes with that owner.

This module does **not** delete mail, verification, DKIM, SPF, Resend, Amazon SES, or Cloudflare Email Routing records. Email-domain policy is handled in 17.11.

## Approved web-host DNS matrix

| Hostname | Required final state | Forbidden competing state |
| --- | --- | --- |
| `rcitcs.com` | Cloudflare-managed Custom Domain for `rc-it-consulting-services` | third-party A/CNAME/Pages/Vercel/Supabase pointer |
| `www.rcitcs.com` | Cloudflare-managed Custom Domain for `rc-it-consulting-services` | NXDOMAIN after final-main activation or third-party CNAME |
| `admin.rcitcs.com` | Cloudflare-managed Custom Domain for `rcitcs-admin-production` | public-Worker route, staging ownership, third-party pointer |
| `admin-staging.rcitcs.com` | Cloudflare-managed Custom Domain for `rcitcs-admin-staging` | production-admin ownership, third-party pointer |

The historical 17.1 overlap remains audit evidence only. It is not an accepted final DNS state.

## Cleanup strategy

The web-host DNS records are Worker-managed records created by Cloudflare Custom Domains. Therefore the safe cleanup mechanism is the converged Wrangler deployment model from 17.7, not manual replacement with arbitrary A/CNAME records.

The final-main deployment sequence must:

1. deploy the public Worker with only `rcitcs.com` and `www.rcitcs.com`;
2. deploy `rcitcs-admin-production` with only `admin.rcitcs.com`;
3. deploy `rcitcs-admin-staging` with only `admin-staging.rcitcs.com`;
4. allow Wrangler/Cloudflare to remove obsolete route/custom-domain claims owned by the old script configuration;
5. verify the four public hostnames resolve through Cloudflare with no external web-host CNAME.

No email-related DNS record is part of this cleanup set.

## Public-DNS acceptance

Before merge, the gate is read-only and permits the already-recorded historical `www` NXDOMAIN state because branch source cannot activate Cloudflare DNS.

After final-main activation, all four approved web hostnames must resolve. The gate rejects CNAME targets containing any of the following external/legacy delivery families:

- `vercel.app`
- `pages.dev`
- `workers.dev`
- `supabase.co`

The production apex must remain the canonical public host; `www` remains only the permanent alias defined in 17.3.

## Preserved DNS surfaces

The 17.1 inventory recorded 13 zone records, including:

- Cloudflare Email Routing MX records at the apex;
- `links.rcitcs.com` Resend CNAME;
- `send.rcitcs.com` Amazon SES feedback MX;
- SPF/DKIM/verification TXT records.

17.8 does not authorize their removal or replacement.

## Regression coverage

`tests/phase17-dns-cleanup.mjs` verifies the source-controlled web-host ownership matrix, rejects duplicate hostname claims, preserves the immutable 17.1 mail-record inventory as an explicit non-target, and prevents legacy Worker route reintroduction.

`.github/workflows/phase17-dns-cleanup.yml` performs read-only public-DNS classification on pull requests and requires full four-host resolution with no external web-host CNAME after final-main activation.

## Closure criteria

17.8 may close at branch level when:

- source config contains no duplicate web hostname owner;
- no legacy Worker config claims an RC IT company hostname;
- email DNS is explicitly outside the deletion set;
- the DNS-cleanup source test passes;
- public-DNS classification passes without mutation;
- full inherited CI remains green.

Final Phase-17 closure still requires the post-main activation gate to prove all four web hostnames resolve in the converged Cloudflare control plane.
