---
id: "00001"
title: "Rebuild Skywords as React/TypeScript SPA with GitHub Pages deploy"
status: in-progress
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

## Team Execution Model

Orchestrated by a lead agent (no code edits). Work agents execute in worktrees.

### Dependency Graph

```
Task 1: scaffolder (main branch)
    │
    ├──► Task 2: ci-cd       (worktree, parallel)
    │
    └──► Task 3: services    (worktree, parallel)
              │
              ▼
         Task 4: ui          (worktree, after merge of 2+3)
              │
              ▼
         Task 5: qa          (worktree, after merge of 4)
```

### Agent Assignments

| Task | Agent | Worktree | Phases | Model |
|------|-------|----------|--------|-------|
| 1. Project scaffolding | `scaffolder` | no (main) | Phase 0 | sonnet |
| 2. CI/CD pipeline | `ci-cd` | yes | Phase 1 | haiku |
| 3. Types + services | `services` | yes | Phase 2 + 3 | sonnet |
| 4. UI + styling | `ui` | yes | Phase 4 + 5 + 6 + 7 | sonnet |
| 5. QA + docs | `qa` | yes | Phase 8 + 9 | sonnet |

### Reference Documents (in this folder)

- [QUALITY-STANDARDS.md](./QUALITY-STANDARDS.md) — **READ FIRST** — strict TypeScript, ESLint, fail-fast, YAGNI rules
- [ARCHITECTURE.md](./ARCHITECTURE.md) — data model, service layer, Vite config, GH Actions workflow
- [COMPONENTS.md](./COMPONENTS.md) — full component tree with TypeScript props
- [CURRENT-SYSTEM.md](./CURRENT-SYSTEM.md) — current site JS/CSS/HTML source (reference for behaviour matching)

---

## Task Breakdown

### Task 1 — Project Scaffolding (agent: `scaffolder`)

**Runs on:** main branch (foundation for all other work)
**Blocked by:** nothing
**Blocks:** Tasks 2, 3

- [ ] Initialise Vite + React + TypeScript project in repo root
  - `npm create vite@latest . -- --template react-ts`
  - Preserve existing `.git/`, `.claude/`, `CLAUDE/`, `.gitignore`, `CLAUDE.md`
- [ ] Install runtime dependencies: `dompurify`, `@types/dompurify`
- [ ] Install dev dependencies: `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `typescript-eslint`
- [ ] Configure `vite.config.ts` with `base` set to `/skywords/` (GitHub Pages path)
- [ ] Configure `tsconfig.json` — maximum strictness (see QUALITY-STANDARDS.md):
  `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`,
  `noImplicitOverride`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`,
  `noPropertyAccessFromIndexSignature`
- [ ] Configure `eslint.config.js` — flat config with full `typescript-eslint` rule set (see QUALITY-STANDARDS.md):
  ban `any`, ban `as` assertions, ban `!` assertions, ban `eval`, enforce `eqeqeq`,
  `no-console`, `prefer-const`, `max-depth: 3`, `no-else-return`
- [ ] Append to `.gitignore`: `dist/`, `node_modules/`
- [ ] Verify `npm run dev` starts successfully (start and kill)
- [ ] Verify `npm run build` produces `dist/`
- [ ] Remove Vite boilerplate: default App.tsx content, App.css, assets/react.svg, public/vite.svg
- [ ] Set up minimal App.tsx placeholder that renders "Skywords" text
- [ ] Commit to main

### Task 2 — CI/CD Pipeline (agent: `ci-cd`)

**Runs on:** worktree
**Blocked by:** Task 1
**Blocks:** Task 4

- [ ] Create `.github/workflows/deploy.yml`
  - Trigger: push to `main`
  - Steps: checkout → setup Node 20 → npm ci → npm run build → deploy
  - Use `peaceiris/actions-gh-pages@v4` action
  - Set `permissions: contents: write`
- [ ] Commit on worktree branch

### Task 3 — Types + Core Services (agent: `services`)

**Runs on:** worktree
**Blocked by:** Task 1
**Blocks:** Task 4

Read `CLAUDE/Plan/00001-skywords-rebuild/QUALITY-STANDARDS.md` — all code must comply.
Read `CLAUDE/Plan/00001-skywords-rebuild/ARCHITECTURE.md` for detailed service specs.
Read `CLAUDE/Plan/00001-skywords-rebuild/CURRENT-SYSTEM.md` for current JS logic to replicate.

- [ ] `src/types/DocData.ts` — exported interfaces: `Subsection`, `Section`, `DocData`
- [ ] `src/services/fetchDoc.ts` — `fetchGoogleDoc(url: string): Promise<string>`
  - `fetch(url, { cache: 'no-store' })` — always live, never cached
  - Append `?embedded=true` if not already present
  - Throw typed errors for network failure, non-200 response
- [ ] `src/services/docParser.ts` — `parseGoogleDoc(html: string): DocData`
  - Use `DOMParser` to parse HTML string into DOM (no jQuery)
  - Walk H1 elements → sections; H2 elements between H1s → subsections
  - Content = HTML between headings, serialised back to string
  - Rewrite Google redirect links (`google.com/url?q=`) to direct URLs
  - Map Google Docs `ul` class suffixes (`-0` … `-5`) to `data-indent` attributes
  - Sanitise with DOMPurify
  - Filter out sections with empty/whitespace titles
- [ ] `src/services/urlParams.ts` — `getDocUrl(): string | null`, `setDocUrl(url: string): void`
  - Parse `window.location.hash` for `#url=` or `#id=` params
  - For `#id=`: construct full `https://docs.google.com/document/d/e/{id}/pub` URL
- [ ] Verify `npm run build` still passes with new files
- [ ] Commit on worktree branch

### Task 4 — UI Components + Styling (agent: `ui`)

**Runs on:** worktree (based on main after Tasks 2+3 merged)
**Blocked by:** Tasks 2, 3
**Blocks:** Task 5

Read `CLAUDE/Plan/00001-skywords-rebuild/QUALITY-STANDARDS.md` — all code must comply.
Read `CLAUDE/Plan/00001-skywords-rebuild/COMPONENTS.md` for detailed component specs.
Read `CLAUDE/Plan/00001-skywords-rebuild/CURRENT-SYSTEM.md` for current site CSS/layout reference.

- [ ] `src/index.css` — global resets, CSS custom properties (colour palette from current site)
- [ ] Google Fonts `<link>` (Commissioner) and Font Awesome CDN `<link>` in `index.html`
- [ ] Download `dhcp_logo.jpeg` from `https://www.dhpc.org.uk/skywords/dhcp_logo.jpeg` into `public/`
- [ ] Update `index.html`: title "Skywords — DHPC Newsletter", meta description
- [ ] `src/components/Header/` — Header.tsx + Header.module.css
- [ ] `src/components/Instructions/` — Instructions.tsx + Instructions.module.css
- [ ] `src/components/DocumentIndex/` — DocumentIndex.tsx + DocumentIndex.module.css
- [ ] `src/components/SectionView/` — SectionView.tsx + SectionView.module.css
- [ ] `src/components/NavigationControls/` — NavigationControls.tsx + NavigationControls.module.css
- [ ] `src/components/LoadingSpinner/` — LoadingSpinner.tsx + LoadingSpinner.module.css
- [ ] `src/components/ErrorMessage/` — ErrorMessage.tsx + ErrorMessage.module.css
- [ ] `src/App.tsx` + `src/App.module.css` — root component with state machine
  - States: `idle` | `loading` | `loaded` | `error`
  - Uses services from `src/services/`
  - Navigation handlers wired to `currentSection`
- [ ] Responsive: 600px breakpoint (logo hide, header shrink), 80% width content area
- [ ] Error handling: loading spinner, network error with retry, invalid URL validation
- [ ] Verify `npm run build` passes with zero errors
- [ ] Commit on worktree branch

### Task 5 — QA + Documentation (agent: `qa`)

**Runs on:** worktree (based on main after Task 4 merged)
**Blocked by:** Task 4

- [ ] `npm run build` succeeds with zero TypeScript errors
- [ ] ESLint reports zero errors (fix any found)
- [ ] Test with example Google Doc URL in dev server
- [ ] Verify `#url=<doc-url>` hash routing loads correctly
- [ ] Verify `#id=<doc-id>` shorthand works
- [ ] Verify section navigation: index → section → back/next → home
- [ ] Verify Google redirect links are rewritten to direct URLs
- [ ] Verify list indentation renders correctly
- [ ] Verify images from Google Docs render with `max-width: 100%`
- [ ] Update `README.md` with project description, dev instructions, deploy info, URL format
- [ ] Fix any issues found during QA
- [ ] Commit on worktree branch

---

## Acceptance Criteria

### Build & Lint (non-negotiable)

- [ ] `npm run build` — zero errors, zero warnings
- [ ] `npm run lint` — zero errors
- [ ] No `any` types anywhere in the codebase
- [ ] No `as` type assertions anywhere in the codebase
- [ ] No `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error` anywhere
- [ ] No non-null assertions (`!`) anywhere
- [ ] No `console.log` in committed code
- [ ] No commented-out code, no TODO/FIXME comments

### Functional

- [ ] Example Google Doc renders matching the current AngularJS version
- [ ] Section navigation works: index → section → subsections → back/next/home
- [ ] Refreshing the page with a `#url=` hash re-fetches the live doc
- [ ] `#id=` shorthand also works
- [ ] Google redirect links rewritten to direct URLs
- [ ] List indentation renders correctly (levels 0-5)
- [ ] Images from Google Docs render with `max-width: 100%`
- [ ] No AngularJS, jQuery, or W3.CSS dependencies remain

### Code Quality

- [ ] All functions under 30 lines
- [ ] Max nesting depth of 3
- [ ] Guard clauses used throughout — no pyramid nesting
- [ ] Services are pure (no React, no DOM side effects except DOMParser)
- [ ] Components are UI-only (no data fetching, no parsing logic)
- [ ] No hardcoded special cases or overfitted logic
- [ ] Fail-fast: invalid inputs throw with clear messages, never silently degrade

### Deploy

- [ ] GitHub Actions workflow deploys successfully to GitHub Pages on push to `main`

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
