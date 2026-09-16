# Phase 17.11 — Email-domain DNS verification

Status: **CLOSED — branch verification complete; final-main DMARC activation remains a Phase-17.13/17.16 production gate**

Depends on Phase 17.10 closure SHA `f3315c3ef823dac31a5f0655b10e84a946fd5193`.

Verification head: `8b396b01bbb00382d01eea5985b6686d59e6c37d`.

## Objective

Preserve working Cloudflare Email Routing while independently proving the outbound Resend identity for `rcitcs.com` and identifying any domain-authentication gap without deleting unrelated mail DNS.

## Verified provider state

Resend reports `rcitcs.com` as verified in `eu-west-1`, sending enabled, receiving disabled, with verified DKIM, `send.rcitcs.com` SPF/MX, and `links.rcitcs.com` tracking identity.

The exact-head public-DNS gate independently proved:

- apex Cloudflare Email Routing MX records `route1.mx.cloudflare.net`, `route2.mx.cloudflare.net`, and `route3.mx.cloudflare.net`;
- apex SPF `v=spf1 include:_spf.mx.cloudflare.net ~all`;
- Resend DKIM at `resend._domainkey.rcitcs.com`;
- Resend/Amazon SES return-path MX and SPF at `send.rcitcs.com`;
- Resend tracking CNAME at `links.rcitcs.com`.

## DMARC finding

The exact-head public-DNS run classified `_dmarc.rcitcs.com` as **absent**. That is a concrete domain-security gap, not a reason to rewrite already-correct mail records.

Phase 17 therefore carries the following production requirement into 17.13 and final closure:

`v=DMARC1; p=none; rua=mailto:dmarc@rcitcs.com; adkim=s; aspf=s; pct=100`

The initial policy is monitoring-only (`p=none`); enforcement escalation is outside this phase.

## Activation boundary

The Phase-17.11 workflow is read-only. Pull-request runs classify the current DMARC state without mutating production DNS. Final `main` requires a valid DMARC record to be publicly resolvable before Phase 17 can close.

The workflow never removes or rewrites the existing Cloudflare Email Routing MX/SPF, Resend DKIM, return-path, or tracking records.

## Closure evidence

- dedicated Phase-17.11 source contract: PASS;
- Cloudflare Email Routing MX/SPF: PASS;
- Resend DKIM/return-path/tracking DNS: PASS;
- DMARC classification: absent and explicitly carried as a later security/final-main blocker;
- exact-head inherited checks: no failures.

17.11 is closed as a verification module. Production DMARC remediation is intentionally handled by the domain-security/final-activation gates rather than hidden inside a verification workflow.
