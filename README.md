# Skywords — DHPC Newsletter Viewer

A React/TypeScript web app that reads published Google Docs and renders them as navigable newsletters for the [Dales Hang Gliding and Paragliding Club](https://www.dhpc.org.uk/).

## What it does

- Fetches a published Google Doc (live, no cache)
- Parses the document structure into sections (H1) and subsections (H2)
- Renders a navigable newsletter: index → section → back/home/next
- Sanitises all HTML with DOMPurify before rendering
- Rewrites Google redirect links to their real destinations

## Tech stack

- React 18 + TypeScript (strict)
- Vite
- CSS Modules
- DOMPurify

## Development

```bash
npm install
npm run dev      # local dev server at http://localhost:5173
npm run build    # production build to dist/
npm run lint     # ESLint (zero warnings/errors required)
```

## Deployment

GitHub Actions auto-deploys to GitHub Pages on every push to `main`.

## URL format

Two hash-based routing formats are supported:

```
# Full published Google Doc URL
https://your-deployment/#url=https://docs.google.com/document/d/e/2PACX-1vA.../pub

# Short form using the doc ID
https://your-deployment/#id=2PACX-1vA...
```

To test locally, paste a published Google Doc URL into the input field on the home page, or navigate directly using the hash formats above.

> A Google Doc must be published to the web (File → Share → Publish to web) before it can be loaded.
