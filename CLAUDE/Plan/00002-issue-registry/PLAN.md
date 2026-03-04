# Plan: Issue Registry System

## Context

The Skywords app currently requires users to paste a Google Docs URL. This plan adds an **issue registry** — a CSV-driven system that maps newsletter issues (e.g., "March 2026") to Google Docs URLs, with three lifecycle statuses:

- **Pre-release**: Password-protected, live-fetched from Google Docs (for preview before publishing)
- **Published**: Public, live-fetched from Google Docs (edits show up in real-time)
- **Frozen**: Public, served from pre-built JSON (no Google Docs dependency, instant load)

Lifecycle: pre-release → published → frozen (manual CSV edits trigger transitions)

---

## Architecture Overview

```
issues.csv (source of truth, in repo)
     │
     ├─ [build time] scripts/freeze.ts reads CSV
     │   ├─ For frozen issues: fetches Google Doc, parses → public/issues/{slug}.json
     │   └─ For all issues: generates public/registry.json
     │
     ├─ [build time] Vite copies public/ → dist/
     │
     └─ [runtime] React app loads registry.json
         ├─ Shows issue index (IssueIndex component)
         ├─ Frozen issues: loads /issues/{slug}.json (local, fast)
         ├─ Published issues: fetches live from Google Docs
         └─ Pre-release issues: password gate → live fetch
```

Legacy `#url=` / `#id=` mode is preserved as a fallback (no UI to reach it — URL-only).

---

## Key Decisions

1. **Shared parser logic** — `docParser.ts` has ~125 lines of non-trivial DOM parsing. Rather than duplicate it for the Node.js freeze script, extract the core logic into `docParserCore.ts` that accepts `Document` + `sanitize` callback. Both browser and Node entry points call the same code. The `serialise()` function uses `node.ownerDocument` instead of the global `document`, making it environment-agnostic.

2. **Password** — Single shared password for all pre-release issues. SHA-256 hash stored in `VITE_PRERELEASE_PASSWORD_HASH` env var (GitHub Actions secret + `.env.local` for dev). Client-side comparison via Web Crypto API. Not cryptographically secure (it's GitHub Pages), but adequate for newsletter preview.

3. **No auto-freeze** — Status transitions are manual (edit CSV, push). A cron job could be added later but YAGNI.

4. **Registry 404 = empty** — If `registry.json` doesn't exist (local dev without running freeze), the app falls back to the legacy Instructions component. No crash.

5. **Hash routing** — New `#issue={slug}` param. No hash = issue index. `#url=`/`#id=` = legacy mode.

---

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `issues.csv` | Issue registry (slug, title, doc_url, status) |
| `scripts/freeze.ts` | Build-time: reads CSV, freezes issues, generates registry.json |
| `src/types/Registry.ts` | `IssueStatus`, `Issue`, `Registry` interfaces |
| `src/services/docParserCore.ts` | Extracted DOM parsing logic (environment-agnostic) |
| `src/services/registry.ts` | Loads + validates registry.json at runtime |
| `src/services/frozenDoc.ts` | Loads + validates frozen issue JSON at runtime |
| `src/services/passwordCheck.ts` | SHA-256 password comparison via Web Crypto |
| `src/components/IssueIndex/IssueIndex.tsx` + `.module.css` | Issue listing page |
| `src/components/PasswordGate/PasswordGate.tsx` + `.module.css` | Password prompt |
| `tsconfig.scripts.json` | TypeScript config for scripts/ (Node + DOM libs) |
| `.env.example` | Documents VITE_PRERELEASE_PASSWORD_HASH |

### Modified Files

| File | Change |
|------|--------|
| `src/services/docParser.ts` | Thin wrapper: calls `parseDocument()` from docParserCore |
| `src/services/urlParams.ts` | Add `HashMode` discriminated union, `getHashMode()`, `setIssueSlug()` |
| `src/App.tsx` | New state machine (7 states), new handlers, new component imports |
| `src/components/DocumentIndex/DocumentIndex.tsx` | Add optional `onBackToIndex` prop |
| `.github/workflows/deploy.yml` | Add `npm run freeze` step + env var |
| `eslint.config.js` | Add scripts/ override (node globals) |
| `package.json` | Add `freeze` script, add jsdom + tsx dev deps |

### Unchanged Files

`fetchDoc.ts`, `DocData.ts`, `Header.tsx`, `SectionView.tsx`, `NavigationControls.tsx`, `Instructions.tsx`, `LoadingSpinner.tsx`, `ErrorMessage.tsx`, `vite.config.ts`, `tsconfig.app.json`, `index.css`

---

## Detailed Implementation

### 1. `issues.csv`

```csv
slug,title,doc_url,status
```

One test row with the existing doc URL (status: published) for verification.

### 2. `src/types/Registry.ts`

```typescript
export type IssueStatus = 'pre-release' | 'published' | 'frozen';

export interface Issue {
  readonly slug: string;
  readonly title: string;
  readonly docUrl: string;
  readonly status: IssueStatus;
}

export interface Registry {
  readonly issues: readonly Issue[];
}
```

### 3. `src/services/docParserCore.ts`

Extract all functions from current `docParser.ts` into this file. Key change: `serialise()` uses `nodes[0]?.ownerDocument` instead of global `document`. Export `parseDocument(doc: Document, sanitize: Sanitize): DocData`.

```typescript
export type Sanitize = (html: string) => string;

// All existing helper functions moved here (rewriteLinks, rewriteImageUrls, etc.)
// buildSubsection and buildSection receive `sanitize` as parameter

export function parseDocument(doc: Document, sanitize: Sanitize): DocData {
  rewriteLinks(doc);
  rewriteImageUrls(doc);
  fixListIndent(doc);
  const title = extractTitle(doc);
  const h1s = Array.from(doc.querySelectorAll('h1'));
  const sections = h1s
    .map((h1, idx) => {
      const nextH1 = idx < h1s.length - 1 ? h1s[idx + 1] : null;
      return buildSection(h1, nextH1 ?? null, sanitize);
    })
    .filter((s) => s.title.trim().length > 0);
  return { title, sections };
}
```

### 4. `src/services/docParser.ts` (simplified)

```typescript
import DOMPurify from 'dompurify';
import { parseDocument } from './docParserCore';

export function parseGoogleDoc(html: string): DocData {
  if (html.length === 0) throw new Error('parseGoogleDoc: html must not be empty');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return parseDocument(doc, (h) => DOMPurify.sanitize(h));
}
```

### 5. `src/services/urlParams.ts` — add HashMode

```typescript
export type HashMode =
  | { readonly kind: 'issue'; readonly slug: string }
  | { readonly kind: 'url'; readonly url: string }
  | { readonly kind: 'none' };

export function getHashMode(): HashMode { /* check issue, then id, then url, else none */ }
export function setIssueSlug(slug: string): void { /* set #issue= and reload */ }
// Keep existing getDocUrl() and setDocUrl() unchanged
```

### 6. `src/services/registry.ts`

```typescript
export async function loadRegistry(): Promise<Registry> {
  // Fetch registry.json from BASE_URL
  // Return { issues: [] } on 404 (dev mode without freeze)
  // Validate with type guards (no `as`, no `any`)
  // Throw on non-404 errors
}
```

### 7. `src/services/frozenDoc.ts`

```typescript
export async function loadFrozenDoc(slug: string): Promise<DocData> {
  // Fetch /issues/{slug}.json from BASE_URL
  // Validate with DocData type guards
  // Throw on error
}
```

### 8. `src/services/passwordCheck.ts`

```typescript
export async function checkPassword(candidate: string): Promise<boolean> {
  // SHA-256 via crypto.subtle.digest
  // Compare with VITE_PRERELEASE_PASSWORD_HASH env var
  // Fail-fast if env var missing/invalid
}
```

### 9. `src/App.tsx` — New State Machine

```typescript
type AppState =
  | { readonly status: 'registry-loading' }
  | { readonly status: 'index'; readonly registry: Registry }
  | { readonly status: 'password'; readonly registry: Registry; readonly issue: Issue; readonly passwordError: string | null }
  | { readonly status: 'loading'; readonly registry: Registry | null }
  | { readonly status: 'loaded'; readonly registry: Registry | null; readonly doc: DocData; readonly currentSection: number | null }
  | { readonly status: 'error'; readonly registry: Registry | null; readonly message: string }
  | { readonly status: 'idle' }; // legacy mode fallback
```

**Flow:**
- No hash → `registry-loading` → `index` (or `idle` if registry empty)
- `#issue=slug` → `registry-loading` → `password` (if pre-release) or `loading` → `loaded`
- `#url=`/`#id=` → `loading` → `loaded` (legacy path, skips registry)

**Handlers:**
- `handleIssueSelect(slug)` — sets hash, navigates to issue
- `handlePasswordSubmit(password)` — checks password, transitions to loading
- `handleBackToIndex()` — returns to issue list
- Existing `handleSectionSelect`, `handleHome`, `handleBack`, `handleNext` — unchanged logic

### 10. New Components

**IssueIndex** — Lists issues from registry. Pre-release issues show "Preview" badge. Each is a clickable button calling `onIssueSelect(slug)`.

**PasswordGate** — Password input field + unlock button. Displays error message on wrong password. Calls `onSubmit(password)`.

### 11. DocumentIndex — add `onBackToIndex`

```typescript
interface DocumentIndexProps {
  readonly doc: DocData;
  readonly onSectionSelect: (index: number) => void;
  readonly onBackToIndex: (() => void) | undefined;  // undefined in legacy mode
}
```

Renders a "Back to Issues" link when `onBackToIndex` is provided.

### 12. `scripts/freeze.ts`

```typescript
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { parseDocument } from '../src/services/docParserCore';

// 1. Read issues.csv (simple string parsing, no external CSV lib)
// 2. For each frozen issue: fetch HTML, parse with jsdom + parseDocument(), write JSON
// 3. Generate public/registry.json with all issues
// Uses process.stderr.write for build output (not console.log)
```

### 13. `.github/workflows/deploy.yml`

```yaml
steps:
  - ...checkout, setup-node, npm ci...
  - run: npm run freeze
    env:
      VITE_PRERELEASE_PASSWORD_HASH: ${{ secrets.PRERELEASE_PASSWORD_HASH }}
  - run: npm run build
  - ...deploy...
```

The freeze step runs BEFORE `npm run build` so `public/registry.json` and `public/issues/*.json` are included in the Vite build output.

### 14. ESLint Config

Add override for `scripts/**/*.ts` with `globals.node` instead of `globals.browser`. Same TypeScript rules.

### 15. Package.json

```json
"scripts": {
  "freeze": "tsx scripts/freeze.ts"
},
"devDependencies": {
  "jsdom": "...",
  "@types/jsdom": "...",
  "tsx": "..."
}
```

---

## Task Breakdown

### Task 1: Foundation — Types + URL params + CSV (no dependencies)
- Create `src/types/Registry.ts`
- Extend `src/services/urlParams.ts` with `HashMode`, `getHashMode()`, `setIssueSlug()`
- Create `issues.csv` with test data
- Create `tsconfig.scripts.json`
- Create `.env.example`

### Task 2: Parser refactor — Extract docParserCore (depends on Task 1)
- Create `src/services/docParserCore.ts` (move logic from docParser.ts)
- Simplify `src/services/docParser.ts` to thin wrapper
- Verify `npm run build` and `npm run lint` still pass

### Task 3: Runtime services (depends on Task 1)
- Create `src/services/registry.ts` (load + validate registry.json)
- Create `src/services/frozenDoc.ts` (load + validate frozen JSON)
- Create `src/services/passwordCheck.ts` (SHA-256 via Web Crypto)

### Task 4: UI components (depends on Task 1)
- Create `src/components/IssueIndex/IssueIndex.tsx` + CSS
- Create `src/components/PasswordGate/PasswordGate.tsx` + CSS
- Modify `src/components/DocumentIndex/DocumentIndex.tsx` (add onBackToIndex)

### Task 5: App.tsx rewrite (depends on Tasks 2, 3, 4)
- Rewrite state machine with 7-state discriminated union
- Wire all new services and components
- Verify full app works with registry

### Task 6: Freeze script + CI/CD (depends on Task 2)
- Install jsdom + tsx dev dependencies
- Create `scripts/freeze.ts`
- Add `freeze` script to package.json
- Update `.github/workflows/deploy.yml`
- Update `eslint.config.js` with scripts/ override

### Task 7: Code review gate (depends on all)
- Security review (Opus) — XSS, password handling, URL safety
- Quality review (Opus) — all CLAUDE.md standards
- Both must PASS

---

## Verification

1. **Local dev (no freeze)**: `npm run dev` — app loads, shows issue index (empty → falls back to Instructions), `#url=` legacy mode works
2. **Freeze script**: `npm run freeze` — reads CSV, generates `public/registry.json`, freezes frozen issues to JSON
3. **Local dev (with freeze)**: `npm run dev` — app shows issue index from registry, clicking published issue live-fetches, clicking frozen issue loads cached JSON, pre-release prompts for password
4. **Build**: `npm run build` + `npm run lint` — zero errors/warnings
5. **Deploy**: Push to main → GitHub Actions runs freeze → build → deploy → verify live site

---

## Workflow for Club Editors

1. Author writes newsletter in Google Docs, publishes it (`File → Share → Publish to web`)
2. Add row to `issues.csv`: `2026-03,March 2026,https://docs.google.com/document/d/e/XXXXX/pub,pre-release`
3. Push to main → site rebuilds, issue appears with "Preview" badge, requires password
4. When ready: change status to `published` in CSV, push → issue is now public, live-fetched
5. After ~1 week: change status to `frozen` in CSV, push → build fetches doc one final time, caches as JSON
