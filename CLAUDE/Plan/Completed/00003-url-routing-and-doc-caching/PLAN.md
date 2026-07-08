# Plan 00003: URL Routing and Document Caching

**Status**: Complete
**Created**: 2026-03-05
**Owner**: Claude
**Priority**: High

## Overview

This plan added path-based URL routing and a build-time document caching
pipeline on top of the issue registry (plan 00002), so newsletter issues load
instantly from pre-fetched snapshots instead of always hitting Google Docs live.

This PLAN.md is a retrospective record: the original folder was created without a
written plan document, but the work was delivered and is in production. It is
reconstructed here from the shipped code and git history so the plan tree is
coherent.

## What Shipped

- **Path-based routing** — `src/services/router.ts` replaced the hash-only
  scheme with clean issue paths.
- **Document caching CLI** — `scripts/cache.ts` + `scripts/lib/cache.ts` fetch
  and cache each issue's parsed content and images at build time.
- **Content hashing & freshness** — `src/services/contentHash.ts`,
  `scripts/lib/hash.ts`, and `src/services/freshnessCheck.ts` add SHA-256 content
  hashing and a runtime freshness check for non-frozen issues.
- **Content processing** — `scripts/lib/contentRewriter.ts`,
  `scripts/lib/imageDownloader.ts`, and `scripts/lib/shortUrlResolver.ts` handle
  inline formatting, image download, and short-URL resolution.
- **Cached data location** — cached newsletter data lives under `data/`
  (separated from `docs/`).

## Delivery Evidence

- `120133b` Add document caching, path-based URL routing, and cache CLI
- `f7358d2` Add SHA-256 content hash and runtime freshness check for non-frozen issues
- `4b2cab6` Move cached newsletter data from docs/ to data/ to separate concerns
- `abbcdab` Add text processing: inline formatting, short URL resolution, table styling
- `fe40834` Add Republish Newsletter action and prune orphaned images on re-cache

The routing and caching pipeline underpins the monthly newsletter
add/publish/republish GitHub Actions workflows, which have shipped issues through
August 2026.

## Success Criteria

- [x] Path-based routing resolves issues without a hash param
- [x] Build-time cache produces per-issue snapshots consumed at runtime
- [x] Content hashing detects stale snapshots for non-frozen issues
- [x] Pipeline drives the live newsletter publish workflows
