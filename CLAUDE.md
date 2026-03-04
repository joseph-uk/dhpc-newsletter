# Skywords - DHPC Newsletter Viewer

React/TypeScript rebuild of https://www.dhpc.org.uk/skywords/ — a Google Docs-powered newsletter viewer for Dales Hang Gliding and Paragliding Club.

## Project Structure

- `CLAUDE/PlanWorkflow.md` — planning workflow documentation
- `CLAUDE/Plan/00001/` — plan for the React/TypeScript rebuild (see PLAN.md)
- `src/` — React/TypeScript source (to be created)
- `.github/workflows/` — GitHub Actions deploy pipeline (to be created)

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run lint     # ESLint
```

## Deployment

GitHub Actions auto-deploys to GitHub Pages on push to `main`.

## Key Decisions

- Vite + React 18 + TypeScript
- CSS Modules (no CSS framework)
- DOMPurify for sanitising Google Docs HTML
- Always fetches live from Google Docs (`cache: 'no-store'`)
- Hash-based routing: `#url=<published-doc-url>` or `#id=<doc-id>`

---

### Hooks Daemon

This project uses [claude-code-hooks-daemon](https://github.com/Edmonds-Commerce-Limited/claude-code-hooks-daemon) for automated safety and workflow enforcement.

**After editing `.claude/hooks-daemon.yaml`** — restart the daemon:
```bash
/hooks-daemon restart
```

**Check status**: `/hooks-daemon health`

**Key files**:
- `.claude/hooks-daemon.yaml` — handler configuration
- `CLAUDE/Plan/` — numbered plan directories

**Documentation**: `.claude/hooks-daemon/CLAUDE/LLM-INSTALL.md`
