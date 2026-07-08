# Plan 00006: social preview og tags

**Status**: Complete
**Created**: 2026-07-08
**Owner**: joseph
**Priority**: Medium

## Overview

When a Skywords issue link (e.g. `/dhpc-newsletter/issue/2025-07`) is shared on
social media, messaging apps, or embedded elsewhere, the platform's crawler
fetches the URL and reads static HTML `<meta>` tags to build a rich preview
card. Skywords is a client-rendered React SPA: crawlers do not execute
JavaScript, so today every shared issue link hits the GitHub Pages SPA fallback
(`404.html`) and yields a generic, image-less preview.

This plan adds **build-time static prerendering**: for every issue in the
registry, the build emits a static `dist/issue/<slug>.html` whose `<head>`
carries Open Graph (`og:*`) and Twitter Card (`twitter:*`) tags populated with
the issue title, a description drawn from the issue body, and a landscape
preview image auto-selected from the issue's own inline images. GitHub Pages
serves these files at the clean `/issue/<slug>` URLs, so crawlers get a real
preview while real browsers still boot the SPA and take over client-side.

Backfill is automatic: the build regenerates the whole registry every deploy,
so the first deploy after merge prerenders all existing issues at once. No
per-issue migration step.

## Goals

- Social/crawler previews for every issue URL: title, description, landscape image.
- Preview image auto-selected from the issue's own inline images (no manual curation).
- Site-level default OG/Twitter tags on the index and SPA-fallback pages.
- Canonical origin configurable via env var, defaulting to the GitHub Pages URL.
- All pure logic (image selection, description extraction, tag rendering) unit-tested to the 95% threshold.

## Non-Goals

- Per-article prerendering (`/issue/<slug>/<article>`). Issue-level only — YAGNI.
- Runtime/SSR rendering. Static prerender at build time only.
- Adding an image-processing dependency. Landscape selection reads the inline
  `width`/`height` already present in the frozen JSON `<img>` styles.
- Re-scraping already-shared links (platforms cache per-URL; that is a manual
  operator action via each platform's debugger, documented not automated).

## Design

- **Origin**: full site root incl. base path, `VITE_SITE_ORIGIN`, default
  `https://joseph-uk.github.io/dhpc-newsletter/` (trailing slash). Image URL =
  `${origin}issues/<slug>/images/<file>`; page URL = `${origin}issue/<slug>`.
- **Image selection** (`scripts/lib/ogImageSelect.ts`, pure): walk DocData
  section/subsection content, extract `<img>` tags, parse inline
  `width`/`height` px, keep landscape (ratio ≥ 1.3 and displayed width ≥ 600px),
  return the first suitable `src` path or `null`.
- **Description** (`scripts/lib/ogDescription.ts`, pure): first meaningful
  text block from DocData, HTML-stripped, whitespace-collapsed, truncated to
  ~200 chars on a word boundary with an ellipsis.
- **Tag rendering** (`scripts/lib/metaTags.ts`, pure): `(meta, origin) → string`
  of `<meta>` lines. Attribute-escapes all interpolated text. Absolute image
  URL. Falls back to the site logo when no landscape image is found.
- **Prerender** (`scripts/prerender.ts`): read `dist/index.html` as template +
  `public/registry.json` + each frozen `public/issues/<slug>.json`; inject the
  per-issue tag block into the head; write `dist/issue/<slug>.html`.
- **Static defaults**: index.html and 404.html gain default OG/Twitter tags.
- **Pipeline**: `npm run prerender` runs after `npm run build` in deploy.yml.

## Tasks

### Phase 1: Pure logic (TDD)

- [x] ✅ **Task 1.1**: `ogImageSelect` — select first landscape image src or null.
- [x] ✅ **Task 1.2**: `ogDescription` — extract + truncate issue description.
- [x] ✅ **Task 1.3**: `metaTags` — render escaped OG/Twitter tag block with logo fallback.

### Phase 2: Prerender wiring

- [x] ✅ **Task 2.1**: `scripts/prerender.ts` — emit `dist/issue/<slug>.html` per registry issue (+ `prerenderPage` pure lib, + slug-safety guard).
- [x] ✅ **Task 2.2**: Default OG/Twitter tags in `index.html` and `public/404.html`.
- [x] ✅ **Task 2.3**: `prerender` npm script + `deploy.yml` step after build.

### Phase 3: Review gate

- [x] ✅ **Task 3.1**: Parallel Opus security + quality reviews; both PASS.

### Phase 4: Deploy

- [x] ✅ **Task 4.1**: Merged to `main`; `deploy.yml` auto-deployed and backfilled all 30 issues. Live pages verified.

## Success Criteria

- [x] `npm run build && npm run prerender` emits one `dist/issue/<slug>/index.html` per registry issue with populated og:/twitter: tags.
- [x] Each prerendered file's og:image is an absolute URL to a real landscape image (all 30 resolve HTTP 200; 0 logo fallbacks).
- [x] `npm run lint` and `npm run build` pass with zero errors; every new lib file is ≥95% coverage (repo-wide gate is pre-existing debt).
- [x] Both parallel Opus reviews return PASS.
- [x] Live: `/issue/<slug>` returns 200 with issue-specific OG tags and a resolving og:image.

## Notes & Updates

### 2026-07-08

- Plan scaffolded.
- Recovery cron `dba98a84` created (hourly at :37, non-durable failsafe).
- Analysis confirmed all 30 registry issues have a usable landscape image (0 logo fallbacks) via inline width/height in frozen JSON.
- Design decisions locked: origin configurable (default Pages URL); issue-level previews only.
- Implemented TDD-first: `ogImageSelect`, `ogDescription`, `metaTags`, `prerenderPage` (all pure, collocated tests, each ≥95% coverage). Thin `scripts/prerender.ts` entry mirrors `freeze.ts` (untested orchestration).
- Exported `isDocData` / `isRegistry` guards for reuse in the node prerender path (single source of truth).
- Local verification: `npm run build && npm run prerender` emits 30 `dist/issue/<slug>.html`; all og:image URLs absolute and resolve to real landscape images; 0 logo fallbacks. `npm run lint` clean.
- Repo-wide 95% coverage gate is red on PRE-EXISTING untested files (googleAuth/driveClient/imageDownloader/cache/shortUrlResolver/docParser/router) — verified against baseline HEAD (65.26%); this change raised overall coverage. `deploy.yml` does not gate on coverage. Pre-existing debt tracked separately, not part of this plan.
- Parallel Opus security + quality reviews both returned PASS. Added slug-safety guard in `prerender.ts` per the security reviewer's optional defence-in-depth note.
- Post-deploy live check exposed a serving bug: `peaceiris` publishes `.nojekyll`, which disables GitHub Pages pretty-URLs, so `issue/<slug>.html` was unreachable at the extensionless `/issue/<slug>` that shared links use. Fixed by emitting `issue/<slug>/index.html` instead — `/issue/<slug>` serves the directory index. Redeployed.
- Delivered: feature `aec011f`, merge `10a9a3b`, serving fix `3e9a300` (deploy run 28935043051 green). Live verification: `/issue/2025-07`, `/issue/2024-01`, `/issue/2026-06` all return 200 with correct per-issue og:title and og:image resolving HTTP 200.
