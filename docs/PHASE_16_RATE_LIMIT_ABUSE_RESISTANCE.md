# Phase 16.8 — Rate Limits / Abuse Resistance

## Finding

The existing Phase-9/16.2 controls correctly limited failed sign-in attempts to five per network in 15 minutes and successful password-reset requests to three per network in one hour. Those controls are retained.

The review identified one architectural weakness: network-derived throttles alone are not sufficient as the only abuse boundary because a direct non-browser client can attempt to vary forwarding metadata when addressing the public Edge Function endpoint.

## Convergence

Phase 16.8 adds a database-atomic fixed-window limiter with both per-network and global buckets:

- login network attempt safety net: 10 attempts / 15 minutes;
- login global safety net: 25 attempts / 15 minutes;
- reset network attempt safety net: 6 submissions / hour;
- reset global safety net: 10 submissions / hour.

The stricter historical controls remain in place:

- five failed logins / network / 15 minutes;
- three accepted reset requests / network / hour.

The new global buckets mean rotating or spoofing network identifiers cannot make authentication guesses or reset-email submission unbounded.

## Authority and concurrency

`admin_auth_rate_limits` is private, RLS + FORCE RLS protected and unavailable to browser roles. `consume_admin_auth_rate_limit(...)` is SECURITY INVOKER and executable only by the service role.

Each request atomically consumes its bucket with `INSERT ... ON CONFLICT DO UPDATE`, so concurrent requests cannot all observe an old count and pass a check-then-act race. Fixed-window expiration is not extended by denied attempts.

The server adapter fails closed if database rate-limit authority or its server credential is unavailable.

## UX and privacy

- Sign-in rate limiting returns HTTP 429 with a bounded `Retry-After` value.
- Password-reset throttling deliberately keeps the same generic success page, so throttling does not reveal whether the administrator email exists.
- Bounded audit events are emitted only when a bucket first crosses its threshold, preventing the rate limiter itself from becoming an audit-log amplification path.

## Phase boundary

16.9 owns security headers, cookie attributes and private-cache review. No Phase-17 functionality is introduced here.
