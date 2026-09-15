# Phase 16.11 — Dependency / Supply-Chain Review

## Current dependency inventory

The project has a deliberately small direct npm surface:

- runtime: Bootstrap;
- build-time: esbuild.

Bootstrap `5.3.8` is the current npm release and has no npm dependencies. It is now exact-pinned instead of using a floating caret range.

## Security finding and remediation

The repository declared `esbuild` as `^0.25.9`. Current GitHub security advisories published in June 2026 identify an esbuild integrity issue affecting versions before `0.28.1`; npm currently publishes `0.28.2` as the latest release.

Phase 16.11 therefore upgrades and exact-pins esbuild to `0.28.2`.

This also keeps the project above the earlier `<=0.24.2` development-server CORS advisory fixed in esbuild `0.25.0`.

## CI supply-chain boundaries

The Phase 16 gate scans every GitHub Actions workflow and rejects:

- `pull_request_target` execution of repository code;
- downloaded scripts piped directly from `curl`/`wget` into a shell;
- regression of esbuild onto the reviewed vulnerable line;
- floating direct dependency ranges for Bootstrap/esbuild.

Existing workflow permissions and deployment-secret boundaries remain authoritative and are separately exercised by the CI, runtime-smoke and exact-deployment workflows.

## Lockfile note

This repository currently does not carry a package lock. Because both direct dependencies are now exact-pinned and Bootstrap has no npm dependencies, version drift is substantially reduced; esbuild's platform packages are tied to its exact release. Introducing a lockfile remains a valid future reproducibility improvement, but creating an unverified handwritten lockfile would be less safe than retaining exact reviewed package versions.

## Phase boundary

16.12 owns database/RLS/ACL and dormant helper-function review. Phase 17 remains excluded.
