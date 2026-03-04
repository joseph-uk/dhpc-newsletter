# Architecture — Plan 00001

## Data Model

```typescript
// src/types/DocData.ts

export interface Subsection {
  title: string;
  content: string;   // DOMPurify-sanitised HTML string
}

export interface Section {
  title: string;
  content: string;   // HTML content before the first h2 (may be empty)
  subsections: Subsection[];
}

export interface DocData {
  title: string;
  sections: Section[];
}
```

---

## Application State Machine

The root `App` component owns a single state object:

```
AppState
  ├── status: 'idle' | 'loading' | 'loaded' | 'error'
  ├── doc: DocData | null
  ├── error: string | null
  └── currentSection: number | null   (null = show DocumentIndex)
```

Transitions:

```
idle       → loading  (user submits URL)
loading    → loaded   (fetch + parse success)
loading    → error    (fetch or parse failure)
error      → loading  (user clicks retry)
loaded     → idle     (user clears URL — not implemented in v1)
```

Within `loaded` state, `currentSection` drives navigation:
- `null` → render `<DocumentIndex>`
- `0..n`  → render `<SectionView index={currentSection}>`

---

## Service Layer

### `fetchDoc.ts`

```typescript
export async function fetchGoogleDoc(rawUrl: string): Promise<string>
```

- Appends `?embedded=true` if missing
- Uses `fetch(url, { cache: 'no-store' })` — always live
- Returns raw HTML string on success
- Throws `FetchError` (typed) on network failure or non-200

### `docParser.ts`

```typescript
export function parseGoogleDoc(html: string): DocData
```

- Creates an `HTMLDocument` via `new DOMParser().parseFromString(html, 'text/html')`
- This is a sandboxed document — scripts don't execute, no real DOM attachment
- Extracts `.title` text for `DocData.title`
- Iterates `querySelectorAll('h1')` for sections
- For each section, collects sibling nodes until the next `h1`
- Within that range, splits on `h2` elements for subsections
- Calls `rewriteLinks()` and `fixListIndent()` on collected HTML
- Calls `DOMPurify.sanitize()` on each HTML string
- Returns `DocData`

**Why DOMParser over jQuery `#temp` div:**
- No real DOM attachment means no flash/layout side effects
- Scripts in fetched content never execute
- Cleaner API, no jQuery dependency

### `urlParams.ts`

```typescript
export function getDocUrl(): string | null
export function setDocUrl(url: string): void
```

- `getDocUrl`: parses `window.location.hash`, handles both `#url=` and `#id=` forms
- `setDocUrl`: sets `window.location.hash = '#url=' + encodeURIComponent(url)` then `location.reload()`
- `#id=<docId>` → expands to `https://docs.google.com/document/d/e/<docId>/pub`

---

## Link Rewriting

Google Docs wraps external links in a redirect:
```
https://www.google.com/url?q=https%3A%2F%2Factual-url.com&sa=D&source=...
```

The parser rewrites these to direct URLs using a simple regex on the `q` parameter,
matching the existing behaviour.

```typescript
function rewriteLinks(doc: Document): void {
  doc.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href') ?? '';
    const match = href.match(/google\.com\/url\?q=([^&]+)/);
    if (match) {
      a.setAttribute('href', decodeURIComponent(match[1]));
    }
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });
}
```

---

## List Indentation

Google Docs emits `<ul class="lst-kix_abc-0">`, `<ul class="lst-kix_abc-1">` etc.
The trailing digit encodes indent level (0–5).

The current implementation adds CSS classes `Level_0` … `Level_5` to `<li>` elements.
The React version uses `data-indent="0"` … `data-indent="5"` on `<ul>` elements instead,
styled via CSS attribute selectors — cleaner than class injection:

```css
ul[data-indent="1"] { margin-left: 40px; }
ul[data-indent="2"] { margin-left: 80px; }
/* etc. */
```

---

## HTML Rendering

Parsed and sanitised HTML strings are rendered via React's `dangerouslySetInnerHTML`.
DOMPurify is configured to allow:
- All standard block/inline elements present in Google Docs output
- `img` with `src` (Google Docs images are hosted on `lh3.googleusercontent.com`)
- `a` with `href`, `target`, `rel`
- `table`, `tr`, `td`, `th` (for tabular content)
- `span` with `style` (Google Docs uses inline styles for formatting)

Explicitly stripped by DOMPurify:
- `<script>`, `<style>` tags (not needed, we apply our own styles)
- `on*` event attributes
- `javascript:` URLs

---

## Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  base: '/skywords/',   // matches GitHub Pages path
})
```

If deployed to a custom domain root, change `base: '/'`.

---

## GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## CORS Considerations

Google Docs `/pub` URLs return:
```
Access-Control-Allow-Origin: *
```

This is confirmed by the existing AngularJS implementation which successfully fetches
the same URL from a different origin. No proxy is needed.

The `?embedded=true` parameter is required — it signals Google to serve a stripped-down
HTML page suitable for embedding, without the Google Docs chrome.

---

## File Structure (target)

```
/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── CLAUDE/
│   ├── PlanWorkflow.md
│   └── Plan/
│       └── 00001/
│           ├── PLAN.md
│           ├── ARCHITECTURE.md
│           └── COMPONENTS.md
├── public/
│   ├── dhcp_logo.jpeg
│   └── favicon.ico
├── src/
│   ├── types/
│   │   └── DocData.ts
│   ├── services/
│   │   ├── fetchDoc.ts
│   │   ├── docParser.ts
│   │   └── urlParams.ts
│   ├── components/
│   │   ├── Header/
│   │   │   ├── Header.tsx
│   │   │   └── Header.module.css
│   │   ├── Instructions/
│   │   │   ├── Instructions.tsx
│   │   │   └── Instructions.module.css
│   │   ├── DocumentIndex/
│   │   │   ├── DocumentIndex.tsx
│   │   │   └── DocumentIndex.module.css
│   │   ├── SectionView/
│   │   │   ├── SectionView.tsx
│   │   │   └── SectionView.module.css
│   │   ├── NavigationControls/
│   │   │   ├── NavigationControls.tsx
│   │   │   └── NavigationControls.module.css
│   │   ├── LoadingSpinner/
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── LoadingSpinner.module.css
│   │   └── ErrorMessage/
│   │       ├── ErrorMessage.tsx
│   │       └── ErrorMessage.module.css
│   ├── App.tsx
│   ├── App.module.css
│   ├── main.tsx
│   └── index.css
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── package.json
└── README.md
```
