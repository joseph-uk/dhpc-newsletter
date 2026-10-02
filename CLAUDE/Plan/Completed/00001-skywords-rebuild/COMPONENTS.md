# Components — Plan 00001

## Component Tree

```
App
├── Header
├── (status === 'idle')    → Instructions
├── (status === 'loading') → LoadingSpinner
├── (status === 'error')   → ErrorMessage
└── (status === 'loaded')
    ├── (currentSection === null) → DocumentIndex
    └── (currentSection !== null) → SectionView
                                        └── NavigationControls
```

---

## App (`src/App.tsx`)

Root component. Owns all application state.

**State:**

```typescript
type AppStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface AppState {
  status: AppStatus;
  doc: DocData | null;
  error: string | null;
  currentSection: number | null;
}
```

**On mount (`useEffect`):**

1. Call `getDocUrl()` from `urlParams.ts`
2. If `null` → set `status: 'idle'`
3. If URL → set `status: 'loading'`, call `fetchGoogleDoc(url)`, then `parseGoogleDoc(html)`
4. On success → set `status: 'loaded'`, `doc: result`, `currentSection: null`
5. On failure → set `status: 'error'`, `error: message`

**Handlers:**

- `handleUrlSubmit(url: string)` → calls `setDocUrl(url)` which reloads page
- `handleSectionSelect(index: number)` → sets `currentSection: index`
- `handleHome()` → sets `currentSection: null`
- `handleBack()` → decrements `currentSection`, wraps to `null` at -1
- `handleNext()` → increments `currentSection`, wraps to `null` past last
- `handleRetry()` → sets `status: 'loading'` and re-fetches

---

## Header (`src/components/Header/`)

**Props:** none

**Renders:**

- `<header>` with DHPC dark blue background
- Club logo (`/dhcp_logo.jpeg`) positioned left — hidden below 600px
- Site title "Skywords" centred

**CSS:** matches current `.header` — 150px height, reduced to 100px on mobile

---

## Instructions (`src/components/Instructions/`)

Shown when no `#url=` hash is present (first visit / unknown URL).

**Props:**

```typescript
interface InstructionsProps {
  onSubmit: (url: string) => void;
}
```

**Renders:**

- Brief explanation: "Paste a published Google Docs URL to view it as a newsletter"
- URL `<input>` (controlled)
- "Load" `<button>`
- Example URL shown as hint text
- On submit: validates URL is non-empty, then calls `onSubmit(url)`

---

## DocumentIndex (`src/components/DocumentIndex/`)

The "home" screen after a doc is loaded. Lists all sections.

**Props:**

```typescript
interface DocumentIndexProps {
  doc: DocData;
  onSectionSelect: (index: number) => void;
}
```

**Renders:**

- Doc title (large, uppercase, centred) — from `doc.title`
- For each `doc.sections[i]`:
  - Clickable row with section title
  - Divider line between items
- Click calls `onSectionSelect(i)`

**CSS:** matches `.Index_Section`, `.Section_Link`, `.Index_Title`

---

## SectionView (`src/components/SectionView/`)

Displays a single section with all its subsections.

**Props:**

```typescript
interface SectionViewProps {
  section: Section;
  sectionIndex: number;
  totalSections: number;
  onBack: () => void;
  onHome: () => void;
  onNext: () => void;
}
```

**Renders:**

- Section title (large, uppercase, centred)
- Section intro HTML (`section.content`) via `dangerouslySetInnerHTML`
- For each subsection:
  - Subsection title (medium, uppercase, centred)
  - Subsection content HTML via `dangerouslySetInnerHTML`
- `<NavigationControls>` at the bottom

**CSS:** matches `.Section_Title`, `.Section_Content`, `.Subsection_Title`, `.Subsection_Content`

---

## NavigationControls (`src/components/NavigationControls/`)

Back / Home / Next button row.

**Props:**

```typescript
interface NavigationControlsProps {
  onBack: () => void;
  onHome: () => void;
  onNext: () => void;
  isFirst: boolean;   // disables Back at first section
  isLast: boolean;    // disables Next at last section
}
```

**Renders:**

```
[ ← Back ]   [ ⌂ Home ]   [ Next → ]
```

Uses Font Awesome icons (`fa-arrow-left`, `fa-home`, `fa-arrow-right`).

---

## LoadingSpinner (`src/components/LoadingSpinner/`)

**Props:** none

**Renders:**

- Centred spinner animation (CSS-only, no GIF)
- "Loading document…" text

---

## ErrorMessage (`src/components/ErrorMessage/`)

**Props:**

```typescript
interface ErrorMessageProps {
  message: string;
  onRetry: () => void;
}
```

**Renders:**

- Error icon (Font Awesome `fa-exclamation-triangle`)
- Error message text
- "Try Again" button → calls `onRetry()`
- "Enter a different URL" link → reloads page without hash

---

## Styling Notes

All components use CSS Modules (`.module.css`) for scoped class names.

Global styles in `src/index.css`:

- CSS custom properties (colour palette)
- Font import (`Commissioner` via Google Fonts)
- Base resets
- Global `img { max-width: 100% }` for Google Docs images
- Global `a` colour using `var(--links)`
- List indentation via `ul[data-indent="N"]` selectors (0–5)

The `data-indent` attributes are set by `docParser.ts` when it detects
Google Docs list class suffixes (`-0` through `-5`).
