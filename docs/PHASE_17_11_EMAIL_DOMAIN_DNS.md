# Phase 17.11 — Email-domain DNS verification

Status: **IMPLEMENTED — exact-head verification pending**

Depends on Phase 17.10 closure SHA `f3315c3ef823dac31a5f0655b10e84a946fd5193`.

## Objective

Preserve working Cloudflare Email Routing while independently proving the outbound Resend identity for `rcitcs.com` and adding an explicit DMARC record without deleting unrelated mail DNS.

## Verified provider state

Resend currently reports `rcitcs.com` as verified in `eu-west-1`, sending enabled, receiving disabled, with verified DKIM, `send.rcitcs.com` SPF/MX, and `links.rcitcs.com` tracking identity.

The Phase-17.1 Cloudflare audit already proved that the apex Cloudflare Email Routing MX set and apex SPF record exist. Those records are not owned by the web-domain cleanup and must remain intact.

## Required public DNS contract

- Apex MX retains `route1.mx.cloudflare.net`, `route2.mx.cloudflare.net`, and `route3.mx.cloudflare.net`.
- Apex TXT retains `v=spf1 include:_spf.mx.cloudflare.net ~all`.
- `resend._domainkey.rcitcs.com` publishes a DKIM TXT key.
- `send.rcitcs.com` publishes Resend/Amazon SES return-path MX and SPF.
- `links.rcitcs.com` resolves to the Resend tracking CNAME.
- `_dmarc.rcitcs.com` publishes exactly one DMARC policy record. Phase 17 starts with monitoring policy `p=none` so aggregate data can be observed before any future enforcement escalation.

## Source-controlled activation

The dedicated Phase-17.11 workflow is read-only on pull requests. On final `main`, if `_dmarc.rcitcs.com` is absent, it uses the repository's Cloudflare zone credential to create the single source-controlled TXT record:

`v=DMARC1; p=none; rua=mailto:dmarc@rcitcs.com; adkim=s; aspf=s; pct=100`

It never removes or rewrites the existing Cloudflare Email Routing MX/SPF, Resend DKIM, return-path, or tracking records.

## Closure criteria

17.11 may close at branch level after the provider/DNS source contract, regression test and exact-head CI are green. Final Phase-17 closure additionally requires the post-main workflow to prove the DMARC record and all existing mail records are publicly resolvable together.
