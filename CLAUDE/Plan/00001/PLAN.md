---
id: "00001"
title: "Rebuild Skywords as React/TypeScript SPA with GitHub Pages deploy"
status: active
created: 2026-03-04
updated: 2026-03-04
author: "Claude"
priority: high
tags: [react, typescript, vite, github-actions, github-pages, google-docs]
---

# Plan 00001 — Skywords React/TypeScript Rebuild

## Overview

Full rebuild of [dhpc.org.uk/skywords](https://www.dhpc.org.uk/skywords/) from a legacy
AngularJS 1.5.6 + jQuery SPA into a modern React 18 + TypeScript application, deployed
via GitHub Actions to GitHub Pages.

The core concept is preserved: a published Google Docs document is the sole data source.
On every page load the app fetches the live published HTML, parses it into a section
hierarchy (H1 → sections, H2 → subsections), and renders it as a navigable newsletter.
No backend, no database, no build-time data baking.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for design decisions and [COMPONENTS.md](./COMPONENTS.md)
for the component tree.

---

## Current System Analysis

| Aspect | Current | Problem |
|--------|---------|---------|
| Framework | AngularJS 1.5.6 (EOL 2021) | Security risk, no updates |
| DOM manipulation | jQuery 3.x + AngularJS `$scope` | Mixed paradigms, hard to maintain |
| Build process | None — raw files served | No type checking, no minification |
| Deployment | Manual FTP/rsync to shared host | Error-prone, no CI |
| Styling | W3.CSS + inline CSS vars | External CDN dependency |
| HTML sanitisation | None (`ng-bind-html` via `ngSanitize`) | XSS risk from doc content |
| Link rewriting | Regex on Google redirect URLs | Brittle regex |
| List indentation | Class sniffing on Google Docs `ul` class names | Fragile |

---

## Goals

1. Replace AngularJS + jQuery with React 18 + TypeScript
2. Vite as build tool (fast dev, optimal production bundle)
3. Automated GitHub Actions deploy to GitHub Pages on every push to `main`
4. Preserve: URL scheme (`#url=`, `#id=`), section/subsection navigation, DHPC branding
5. Always fetch live from Google Docs on page load (no stale cache)
6. Sanitise Google Docs HTML output with DOMPurify before rendering
7. Keep the same colour palette and general visual layout
8. Graceful error states (invalid URL, network failure, malformed doc)

---

## Tech Stack

| Role | Choice | Rationale |
|------|--------|-----------|
| UI framework | React 18 | Modern, stable, excellent TS support |
| Language | TypeScript 5.x | Type safety, better maintainability |
| Build tool | Vite 5.x | Fast HMR, simple GH Pages config |
| Styling | CSS Modules + CSS custom properties | Scoped styles, no extra runtime |
| HTML sanitisation | DOMPurify | Industry standard, lightweight |
| Fonts | Google Fonts (Commissioner) — same as current | Visual continuity |
| Icons | Font Awesome 6 via CDN | Same as current |
| Linting | ESLint + typescript-eslint | Code quality |
| Deployment | GitHub Actions + `peaceiris/actions-gh-pages` | Standard approach |

---

## Data Flow (unchanged concept, new implementation)

```
User opens page
  └─ Parse window.location.hash for #url= or #id= param
       ├─ No param → show URL input screen
       └─ Param found → fetch Google Docs published URL
            └─ Parse HTML with DOMParser (replaces jQuery #temp trick)
                 ├─ Extract .title → document title
                 ├─ Extract h1 elements → top-level sections
                 │    └─ Extract h2 elements within each section → subsections
                 ├─ Rewrite Google redirect links → direct URLs
                 ├─ Map ul class names → indentation levels
                 └─ Sanitise with DOMPurify
                      └─ Render navigable SPA
```

---

## Task Breakdown

### Phase 0 — Repository & Tooling Setup

- [ ] Initialise Vite + React + TypeScript project in repo root
  - `npm create vite@latest . -- --template react-ts`
  - Accept overwrite of existing files (only `.git` and `CLAUDE/` present)
- [ ] Install runtime dependencies: `dompurify`, `@types/dompurify`
- [ ] Install dev dependencies: `eslint`, `typescript-eslint`, `@typescript-eslint/parser`
- [ ] Configure `vite.config.ts` with `base` set to `/skywords/` (GitHub Pages path)
- [ ] Configure `tsconfig.json` — strict mode, path aliases
- [ ] Add `.gitignore` entries for `dist/`, `node_modules/`
- [ ] Verify `npm run dev` starts successfully
- [ ] Verify `npm run build` produces `dist/`

### Phase 1 — GitHub Actions & Pages Deploy

- [ ] Create `.github/workflows/deploy.yml`
  - Trigger: push to `main`
  - Steps: checkout → setup Node → install → build → deploy to `gh-pages` branch
  - Use `peaceiris/actions-gh-pages@v4` action
- [ ] Configure GitHub Pages in repo settings to serve from `gh-pages` branch
- [ ] Add `CNAME` file if custom domain (`skywords.dhpc.org.uk` or similar) is needed
  - _Note: clarify with owner whether to keep at `dhpc.org.uk/skywords/` or move_
- [ ] Verify deploy workflow runs and page is accessible

### Phase 2 — Core Services (no UI)

- [ ] `src/services/docParser.ts` — `parseGoogleDoc(html: string): DocData`
  - Use `DOMParser` to parse HTML string into a real DOM (no jQuery)
  - Walk H1 elements → sections; H2 elements between H1s → subsections
  - Content = HTML between headings, serialised back to string
  - Rewrite Google redirect links (`google.com/url?q=`) to direct URLs
  - Map Google Docs `ul` class suffixes (`-0` … `-5`) to `data-indent` attributes
  - Return typed `DocData` structure (see ARCHITECTURE.md)
  - Filter out sections with empty/whitespace titles
- [ ] `src/services/fetchDoc.ts` — `fetchGoogleDoc(url: string): Promise<string>`
  - `fetch(url, { cache: 'no-store' })` — always live, never cached
  - Append `?embedded=true` if not already present
  - Throw typed errors for network failure, non-200 response
- [ ] `src/services/urlParams.ts` — `getDocUrl(): string | null`
  - Parse `window.location.hash` for `#url=` or `#id=` params
  - For `#id=`: construct full `https://docs.google.com/document/d/e/{id}/pub` URL
  - Export `setDocUrl(url: string): void` — updates hash and triggers reload
- [ ] Unit-testable pure functions — write at least smoke tests

### Phase 3 — Type Definitions

- [ ] `src/types/DocData.ts`
  ```typescript
  interface Subsection {
    title: string;
    content: string; // sanitised HTML
  }
  interface Section {
    title: string;
    content: string; // HTML before first h2
    subsections: Subsection[];
  }
  interface DocData {
    title: string;
    sections: Section[];
  }
  ```

### Phase 4 — React Components

See [COMPONENTS.md](./COMPONENTS.md) for full component tree and props.

- [ ] `src/components/Header/Header.tsx` — DHPC branded header
  - Club logo (dhcp_logo.jpeg or SVG equivalent)
  - Site title "Skywords"
  - Responsive: logo hidden below 600px, reduced height
- [ ] `src/components/Instructions/Instructions.tsx` — URL input screen
  - Text explaining the tool
  - URL input + submit button
  - Calls `setDocUrl()` on submit
  - Example link pre-filled or shown as hint
- [ ] `src/components/DocumentIndex/DocumentIndex.tsx` — section list
  - Renders doc title
  - Lists all section titles as clickable links
  - `onSectionSelect(index: number)` callback
- [ ] `src/components/SectionView/SectionView.tsx` — single section
  - Section title (H1-derived)
  - Section intro content (HTML before first H2)
  - List of subsections (each with title + content)
  - `NavigationControls` at bottom
- [ ] `src/components/NavigationControls/NavigationControls.tsx`
  - Back / Home / Next buttons with Font Awesome icons
  - Disabled states at boundaries
  - `onBack`, `onHome`, `onNext` callbacks
- [ ] `src/components/LoadingSpinner/LoadingSpinner.tsx` — fetch in progress
- [ ] `src/components/ErrorMessage/ErrorMessage.tsx` — fetch/parse failure
- [ ] `src/App.tsx` — root component, state machine
  - States: `idle` | `loading` | `loaded` | `error`
  - On mount: call `getDocUrl()`, if URL → fetch → parse → `loaded`
  - If no URL → `idle` (show Instructions)
  - `currentSection: number | null` — null = show index
  - Navigation handlers wired to `currentSection`

### Phase 5 — Styling

- [ ] `src/index.css` — global resets, CSS custom properties (same colour palette)
  ```css
  :root {
    --text: #2b2b3a;
    --blue-bg: #0d3c7c;
    --accent: #1ed2f4;
    --hover: #eafc40;
    --alt: #f5ce28;
    --links: rgb(0, 94, 184);
  }
  ```
- [ ] CSS Module per component (`.module.css`) for scoped styles
- [ ] Preserve list indentation levels via `data-indent` attribute styling
- [ ] Google Fonts `<link>` in `index.html` for Commissioner
- [ ] Font Awesome CDN `<link>` in `index.html`
- [ ] Responsive breakpoints matching current: 600px (logo hide, header shrink)
- [ ] Preserve 80% width content area

### Phase 6 — Assets

- [ ] Source `dhcp_logo.jpeg` from current site (or request SVG from club)
- [ ] Place in `public/` so Vite copies as-is to `dist/`
- [ ] Update `index.html` title and meta description

### Phase 7 — Error Handling & Edge Cases

- [ ] Loading state shown while fetch is in progress
- [ ] Network error (fetch fails) → show ErrorMessage with retry button
- [ ] HTTP non-200 → show ErrorMessage with guidance
- [ ] Google Doc has no H1 headings → show single-page content or error
- [ ] Empty section titles filtered (matching current behaviour)
- [ ] Invalid URL entered by user → validate before fetching (basic URL check)

### Phase 8 — QA & Polish

- [ ] Test with the example Google Doc:
  `https://docs.google.com/document/d/e/2PACX-1vSv7aTai2yfObOHeDmYhtKpXFTQejk7imMRBqzlefdnvKGEHtBsWLlF-xIGUSbMphLnwFub-9jrvHaR/pub`
- [ ] Verify URL hash routing: `#url=<doc-url>` loads directly
- [ ] Verify `#id=<doc-id>` shorthand also works
- [ ] Test section navigation (index → section → back/next → home)
- [ ] Test on mobile viewport (320px, 375px, 768px)
- [ ] Test on desktop (1280px, 1920px)
- [ ] Verify Google redirect links are rewritten correctly
- [ ] Verify list indentation levels render correctly
- [ ] Verify images from Google Docs render (max-width: 100%)
- [ ] Check Lighthouse score (aim for 90+ performance)
- [ ] Verify no XSS vectors in DOMPurify output

### Phase 9 — Documentation

- [ ] Update `README.md` with:
  - Project description
  - Local dev instructions (`npm install`, `npm run dev`)
  - How to deploy (GitHub Actions auto-deploys on push to `main`)
  - How to change the default Google Doc URL
  - URL parameter format (`#url=` and `#id=`)

---

## Acceptance Criteria

- [ ] `npm run build` succeeds with zero TypeScript errors
- [ ] ESLint reports zero errors
- [ ] GitHub Actions workflow deploys successfully to GitHub Pages on push to `main`
- [ ] Example Google Doc renders identically (visually) to the current AngularJS version
- [ ] Section navigation works: index → section → subsections visible → back/next/home
- [ ] Refreshing the page with a `#url=` hash re-fetches the live doc
- [ ] No AngularJS, jQuery, or W3.CSS dependencies remain

---

## Out of Scope (this plan)

- Server-side rendering / Next.js (overkill for a static newsletter viewer)
- Authentication or private Google Doc support
- Multiple simultaneous documents
- Search within document
- Print stylesheet
- Dark mode
- Offline support / service worker

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Google Docs CORS blocks browser fetch | Low | High | `/pub?embedded=true` endpoint has open CORS; confirmed working in current implementation |
| Google Docs HTML structure changes | Medium | High | Parser is isolated in `docParser.ts` — easy to update |
| GitHub Pages base path issues | Low | Medium | Vite `base` config handles this; test early |
| DOMPurify strips legitimate formatting | Low | Low | Configure allowlist to preserve Google Docs tags (img, table, span) |
| Logo asset availability | Low | Low | Fetch from current site or use text fallback |

---

## Dependencies & Blockers

- Repo must have GitHub Pages enabled (owner action required)
- If deploying to `dhpc.org.uk/skywords/`, DNS/reverse-proxy config at host must point to GH Pages (owner action)
- Or: deploy to `<org>.github.io/skywords/` as interim

---

## Notes

- The current site uses `config.js` to store a default URL. The React version will
  default to `null` (show instructions) unless a `#url=` hash is present. A default
  URL can be added as a Vite env variable (`VITE_DEFAULT_DOC_URL`) if desired.
- Google Docs `?embedded=true` removes the Google header/footer, giving cleaner HTML to parse.
- The `DOMParser` approach is cleaner than the current jQuery `#temp` hidden div trick
  and does not require attaching anything to the real DOM.
