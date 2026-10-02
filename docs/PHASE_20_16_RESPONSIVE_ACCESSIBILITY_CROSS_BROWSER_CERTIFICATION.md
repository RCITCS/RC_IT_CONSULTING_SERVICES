# Phase 20.16 Responsive / Accessibility / Cross-Browser Production Acceptance

Phase 20.16 is the final Phase 20 certification module.

It preserves and independently re-certifies the Phase 18/19 responsive and accessibility boundaries:

- public layouts across phone, tablet, laptop and desktop widths;
- Chromium, Firefox and WebKit;
- no document-level horizontal overflow;
- responsive navigation and keyboard dismissal/focus behavior;
- candidate, contact, legal-table and runtime Careers layouts;
- private admin authentication, registers, touch targets and dialogs;
- WCAG 2 A/AA, 2.1 A/AA and 2.2 AA automated checks;
- skip-navigation and visible keyboard-focus behavior;
- reduced-motion and safe-area contracts;
- exact merged-SHA production acceptance.

The dedicated Phase 20.16 browser matrix runs representative public accessibility checks on Chromium, Firefox and WebKit instead of relying only on Chromium accessibility coverage.

20.16 closes only after the exact PR head passes all inherited and dedicated checks, merges with expected-head protection, and the merged main SHA passes the dedicated live-production cross-browser/WCAG acceptance plus all inherited Phase 18/19 gates.
