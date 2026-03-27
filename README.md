# Skywords — DHPC Newsletter Viewer

A React/TypeScript web app that reads published Google Docs and renders them as navigable newsletters for the [Dales Hang Gliding and Paragliding Club](https://www.dhpc.org.uk/).

**Live at [dhpc.org.uk/skywords](https://www.dhpc.org.uk/skywords/)** — the official club page iframes the [GitHub Pages deployment](https://joseph-uk.github.io/dhpc-newsletter/).

## What it does

- Fetches published Google Docs (live, no cache) and renders them as newsletters
- Parses document structure into sections (H1) and subsections (H2)
- Provides navigable reading: index, section view, back/home/next navigation
- Sanitises all HTML with DOMPurify before rendering
- Rewrites Google redirect links to their real destinations
- Caches issue metadata for fast loading and offline resilience

## Tech stack

- React 19 + TypeScript 5.9 (strictest config)
- Vite 7
- CSS Modules
- DOMPurify
- Vitest (95% coverage minimum)

## Development

```bash
npm install
npm run dev            # local dev server
npm run build          # production build to dist/
npm run lint           # ESLint (zero warnings/errors required)
npm run test           # run tests
npm run test:watch     # run tests in watch mode
npm run test:coverage  # run tests with coverage enforcement
```

## Adding a new newsletter

No terminal or code knowledge needed. Everything is done from GitHub in your browser.

### Step 1: Get the published Google Doc URL

1. Open the newsletter Google Doc
2. Go to **File > Share > Publish to web**
3. Click **Publish** (if not already published)
4. Copy the URL — it will look like `https://docs.google.com/document/d/e/2PACX-.../pub`

### Step 2: Add it as a pre-release

1. Go to the [**Add Newsletter** action](https://github.com/joseph-uk/dhpc-newsletter/actions/workflows/add-newsletter.yml)
2. Click the **"Run workflow"** button (top right)
<img width="2333" height="1250" alt="image" src="https://github.com/user-attachments/assets/fa0eda8d-2e60-4ace-be2b-64887bc40ebc" />

  
4. Paste the Google Doc URL into the **first field**
5. **Leave the other fields empty** — the month and year are calculated automatically (next month from today)
6. Click **"Run workflow"**

The newsletter will be added as a **pre-release** (password-protected) so you can review it before making it public.

> Only use the year/month override fields if you need to correct the auto-calculated date (e.g. adding a past issue). Normally leave them blank.

### Step 3: Publish it

Once you're happy with the pre-release:

1. Go to the [**Publish Newsletter** action](https://github.com/joseph-uk/dhpc-newsletter/actions/workflows/publish-newsletter.yml)
2. Click **"Run workflow"**
3. Click **"Run workflow"** again to confirm

That's it — the latest pre-release is promoted to published and the site is redeployed.

## Deployment

GitHub Actions auto-deploys to GitHub Pages on every push to `main`. The pipeline:

1. Installs dependencies (`npm ci`)
2. Updates cached issue data (`npm run cache`) and auto-commits if changed
3. Freezes data (`npm run freeze`)
4. Builds for production (`npm run build`)
5. Deploys `dist/` to GitHub Pages

The [official Skywords page](https://www.dhpc.org.uk/skywords/) on the DHPC website embeds this GitHub Pages deployment via iframe.

## URL format

Two hash-based routing formats are supported:

```
# Full published Google Doc URL
https://www.dhpc.org.uk/skywords/#url=https://docs.google.com/document/d/e/2PACX-1vA.../pub

# Short form using the doc ID
https://www.dhpc.org.uk/skywords/#id=2PACX-1vA...
```

To test locally, paste a published Google Doc URL into the input field on the home page, or navigate directly using the hash formats above.

> A Google Doc must be published to the web (File > Share > Publish to web) before it can be loaded.

## Project structure

```
src/
├── components/    # React UI components
├── services/      # Pure business logic (no React, no DOM side effects)
└── types/         # TypeScript type definitions
```

## Repository

[github.com/joseph-uk/dhpc-newsletter](https://github.com/joseph-uk/dhpc-newsletter)
