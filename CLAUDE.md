# Skywords - DHPC Newsletter Viewer

React/TypeScript rebuild of https://www.dhpc.org.uk/skywords/ — a Google Docs-powered newsletter viewer for Dales Hang Gliding and Paragliding Club.

**This is a public showcase of high-quality AI-driven coding. Every file must meet the standards below.**

## Project Structure

- `CLAUDE/PlanWorkflow.md` — planning workflow documentation
- `CLAUDE/Plan/00001-skywords-rebuild/` — plan for the React/TypeScript rebuild
- `src/` — React/TypeScript source
- `.github/workflows/` — GitHub Actions deploy pipeline

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

- Vite + React 18 + TypeScript (strictest config)
- CSS Modules (no CSS framework)
- DOMPurify for sanitising Google Docs HTML
- Always fetches live from Google Docs (`cache: 'no-store'`)
- Hash-based routing: `#url=<published-doc-url>` or `#id=<doc-id>`

---

## Code Quality Standards

**Reference**: `CLAUDE/Plan/00001-skywords-rebuild/QUALITY-STANDARDS.md` for full rationale.

### TypeScript — Maximum Strictness

This project treats TypeScript as a static analysis tool, not a suggestion system. TypeScript's type system is an "honesty system" — without discipline it provides false confidence.

**tsconfig.json** must include ALL of these:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

**Absolute bans** (enforced by ESLint):
- `any` — never use. Use `unknown` and narrow with type guards.
- `as` type assertions — never use. Use type guards or assertion functions.
- `@ts-ignore` / `@ts-nocheck` / `@ts-expect-error` — never use.
- `JSON.parse()` without validation — always validate with a type guard after parsing.
- Non-null assertions (`!`) — never use. Handle the null case explicitly.
- `eval()`, `new Function()` — never use.

**Required ESLint rules**:
```
@typescript-eslint/no-explicit-any
@typescript-eslint/no-unsafe-assignment
@typescript-eslint/no-unsafe-argument
@typescript-eslint/no-unsafe-return
@typescript-eslint/no-unsafe-member-access
@typescript-eslint/no-unsafe-call
@typescript-eslint/consistent-type-assertions (ban)
```

### Fail Fast

All functions must validate inputs at the top and throw immediately on invalid state. Never silently swallow errors or return fallback defaults that mask problems.

- **Guard clauses first**: validate, throw, return early — then do the work.
- **No silent defaults**: never `value ?? ''` or `value ?? 0` to hide missing data.
- **No empty catch blocks**: every catch must rethrow, log with context, or handle explicitly.
- **No `|| true`**, `2>/dev/null`, or error suppression patterns.
- **Specific error messages**: include what was expected, what was received, and where.

### YAGNI (You Aren't Gonna Need It)

- Build only what the plan specifies. No speculative features.
- No abstract base classes or factory patterns for things with one implementation.
- No configuration systems for things that have one value.
- Three similar lines of code is better than a premature abstraction.
- If it's not in the plan, don't build it.

### Early Returns (Guard Clause Pattern)

- Validate and exit early. Never nest more than 2 levels deep.
- Happy path runs at the base indentation level.
- Each guard clause handles one specific validation.

### Domain Purity

- Services (`src/services/`) contain pure logic — no React, no DOM side effects.
- Components (`src/components/`) contain UI only — no data fetching inside components.
- `App.tsx` is the sole orchestrator between services and components.

### Anti-Overfitting (Critical for AI-generated code)

- Every fix must address the **category** of problem, not just the specific case.
- No hardcoded values that should be parameters.
- No special-case `if` statements for specific inputs.
- If a fix only works for the exact test case provided, it is wrong.
- Preserve generic functionality — never replace broad logic with narrow patches.

### Defence Before Fix

When a bug is found, the first question is: "Can a machine detect this pattern automatically?" Write the lint rule before writing the fix.

**Quality hierarchy** (each layer must pass before the next):
1. Static analysis — TypeScript strict + ESLint (catches entire classes of bugs)
2. Build verification — `npm run build` with zero errors/warnings
3. Manual testing — verify with the real Google Doc

A single lint rule catches every past, present, and future instance of a bug pattern. A single test only catches one instance in one file. Prefer rules over tests where possible.

### General Quality

- **No `console.log` in committed code** — use proper error handling.
- **No commented-out code** — delete it; git has history.
- **No TODO/FIXME in committed code** — fix it or don't write it.
- **Functions under 30 lines** — extract if longer.
- **Single responsibility** — one function does one thing.
- **Descriptive names** — no single-letter variables except loop counters.
- **Immutable by default** — use `const`, `readonly`, `Readonly<T>`.

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
