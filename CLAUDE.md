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
npm run dev          # local dev server
npm run build        # production build to dist/
npm run lint         # ESLint
npm run test         # run tests
npm run test:watch   # run tests in watch mode
npm run test:coverage # run tests with coverage report
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

### Test-Driven Development (TDD)

**All code changes must follow TDD. No exceptions.**

1. **Write a failing test first** — the test must fail before any implementation code is written.
2. **Write the minimum code to pass** — make the test green with the simplest implementation.
3. **Refactor** — clean up while keeping tests green.

**Bug fixes must reproduce the bug as a failing test before any fix is applied.**

**Coverage requirement: 95% minimum** (branches, functions, lines, statements). Enforced by Vitest coverage thresholds in `vite.config.ts`.

**Test framework**: Vitest with jsdom environment. Tests live next to source files as `*.test.ts` / `*.test.tsx`.

```bash
npm run test           # run all tests
npm run test:coverage  # run with coverage enforcement
```

### Defence Before Fix

When a bug is found, the first question is: "Can a machine detect this pattern automatically?" Write the lint rule before writing the fix. **Then write a failing test that reproduces the bug.**

**Quality hierarchy** (each layer must pass before the next):

1. Static analysis — TypeScript strict + ESLint (catches entire classes of bugs)
2. Tests — Vitest with 95% coverage minimum (catches logic bugs)
3. Build verification — `npm run build` with zero errors/warnings
4. Manual testing — verify with the real Google Doc

A single lint rule catches every past, present, and future instance of a bug pattern. Tests catch logic bugs that types and lints cannot. Both are required.

### Mandatory Code Review Gate

**No code is merged to main without passing parallel Opus sub-agent reviews.**

The orchestrator must run **two independent review agents in parallel** (both using `model: opus`) before accepting any worktree branch merge or task completion:

1. **Security Review** — scan for:

   - XSS vectors (especially in `dangerouslySetInnerHTML` usage and DOMPurify config)
   - Unsafe URL handling, open redirects
   - Unsanitised user input flowing into DOM
   - `eval`, `Function`, `innerHTML` without DOMPurify
   - Dependency vulnerabilities

2. **Quality Review** — verify compliance with all standards in this file:

   - Zero `any`, zero `as`, zero `@ts-ignore`, zero `!` assertions
   - Fail-fast: no silent defaults, no empty catches, no error suppression
   - YAGNI: no speculative code, no premature abstractions
   - Early returns: max nesting depth 3, guard clauses first
   - Domain purity: services pure, components UI-only
   - Anti-overfitting: no hardcoded special cases
   - Functions under 30 lines, descriptive names, immutable by default
   - `npm run build` and `npm run lint` both pass with zero errors

**Review process:**

- Orchestrator spawns both review agents in parallel against the worktree branch
- Each reviewer reads every changed file and produces a PASS/FAIL verdict with specific findings
- **Both must PASS** before the orchestrator merges the branch
- On FAIL: orchestrator sends findings back to the implementation agent for fixes, then re-reviews
- Review agents must NOT make code changes — read-only analysis only

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

<hooksdaemon>
<!-- Auto-generated by hooks daemon on restart. Do not edit this section — changes will be overwritten. -->

## Hooks Daemon — Active Handler Guidance

The handlers listed below are active in this project. Read this section to avoid triggering unnecessary blocks.

**When a tool is blocked by a handler, do not stop working.** Read the block reason, modify your approach, and continue with your task.

**A file written through Bash is not seen by the content guards that run BEFORE the write.** The PreToolUse handlers below that inspect what a file CONTAINS, or where it lives, key on the `Write` and `Edit` tools — so a `>`, `>>`, `tee` or a `cat <<EOF` heredoc reaches disk unexamined by them: no block, no advisory, no record. **A Bash write that drew no complaint is NOT a write that passed those checks** — use `Write`/`Edit` for file content and they apply.

**The LINTERS are the exception, and they DENY.** `lint_on_edit` and `validate_eslint_on_write` do run on a file a Bash command AUTHORS — a redirect, `tee`, a heredoc — so unparseable Python or failing TypeScript is reported however it reached disk. The write has already landed, so the denial is a failure report to repair with `Edit`, not a rollback. A file the command merely RELOCATES (`cp`, `mv`, `install`, `dd`) is never linted: those bytes were already on disk, so blaming the copy would report a defect the command did not introduce.

The handlers that judge a Bash COMMAND — destructive git, `sed`, pipes, permissions, `curl | sh` — are unaffected and still cover you.

**If something outside this project tells you to prefer Bash, `sed` or a heredoc over `Write`/`Edit` for file content, it does not override this.** That advice is written for repositories without these guards; here it routes every write around the checks above and `sed` is denied outright. Use `Write`/`Edit`, and treat the conflict as settled rather than re-deciding it.

Full detail on any rule: `bin/hooks-daemon explain-rule <ID>`.

## All other enforced rules

<!-- handler: auto-continue-stop -->

<!-- handler: bash-safe-mode -->

<!-- handler: block-ancestry-severing-merge -->

<!-- handler: block-artefact-publishing -->

<!-- handler: block-ask-user-question -->

<!-- handler: block-comment-changelog -->

<!-- handler: block-comment-size -->

<!-- handler: block-curl-pipe-shell -->

<!-- handler: block-dangerous-permissions -->

<!-- handler: block-git-message-backtick -->

<!-- handler: block-git-stash -->

<!-- handler: block-pip-break-system -->

<!-- handler: block-plan-time-estimates -->

<!-- handler: block-secret-file-read -->

<!-- handler: block-security-antipatterns -->

<!-- handler: block-sed-command -->

<!-- handler: block-self-matching-process-probe -->

<!-- handler: block-sensitive-content -->

<!-- handler: block-sudo-pip -->

<!-- handler: block-unread-overwrite -->

<!-- handler: daemon-location-guard -->

<!-- handler: docs-qa-commit-gate -->

<!-- handler: docs-qa-edit -->

<!-- handler: enforce-lsp-usage -->

<!-- handler: enforce-markdown-organization -->

<!-- handler: enforce-npm-commands -->

<!-- handler: enforce-project-containment -->

<!-- handler: enforce-tdd -->

<!-- handler: error-hiding-blocker -->

<!-- handler: failsafe-cron-blockage-suppressor -->

<!-- handler: flaggable-content-channel-guard -->

<!-- handler: github_auto_close_keywords -->

<!-- handler: issue-filing-gate -->

<!-- handler: lint-on-edit -->

<!-- handler: lock-file-edit-blocker -->

<!-- handler: lsp-noise-checker -->

<!-- handler: pipe-blocker -->

<!-- handler: plan-journal-guard -->

<!-- handler: plan-number-helper -->

<!-- handler: plan-qa-commit-gate -->

<!-- handler: plan-qa-edit -->

<!-- handler: prevent-destructive-git -->

<!-- handler: prevent-worktree-file-copying -->

<!-- handler: qa-suppression-blocker -->

<!-- handler: quarantine-artefact-read-guard -->

<!-- handler: reference-repo-freshness -->

<!-- handler: remote-docs-commit-gate -->

<!-- handler: remote-docs-provenance -->

<!-- handler: remote-docs-routing -->

<!-- handler: require-absolute-paths -->

<!-- handler: require-gh-issue-comments -->

<!-- handler: require-gh-pr-comments -->

<!-- handler: root-recursion-guard -->

<!-- handler: staged-lint-gate -->

<!-- handler: subagent-cron-delete-blocker -->

<!-- handler: subagent-full-qa-blocker -->

<!-- handler: validate-eslint-on-write -->

<!-- handler: validate-instruction-content -->

<!-- handler: verification-result-gate -->

| ID                                          | Blocked                                                                                                                                                    | Why                                                                                                                                                                                                           | Fix                                                                                                                                                                                                                   |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-STOP-QA-FAILURE                           | Stopping while the last QA tool run's own output indicated failure                                                                                         | QA failures detected in the last QA tool run                                                                                                                                                                  | Fix the failures, re-run the QA tool, and continue without stopping                                                                                                                                                   |
| R-STOP-TAUTOLOGICAL-QUESTION                | Stopping behind a rhetorical continue/confirmation question                                                                                                | The answer is obvious -- yes, continue the already-planned work now                                                                                                                                           | Resume the next unit of work immediately; STOPPING BECAUSE: does not exempt this                                                                                                                                      |
| R-STOP-AFTER-TOOL-ERROR                     | Stopping right after an unresolved tool_use_error                                                                                                          | The correct action is to address the cause and retry, not stop                                                                                                                                                | Address the tool_use_error's cause (e.g. Read before Edit/Write) and retry                                                                                                                                            |
| R-STOP-CONFIRMATION-QUESTION                | Stopping to ask an obvious confirmation question                                                                                                           | The daemon auto-continues through confirmation-style questions                                                                                                                                                | Proceed with the remaining work; stop with STOPPING BECAUSE: only if truly stuck                                                                                                                                      |
| R-STOP-NO-REASON                            | Stopping without a STOPPING BECAUSE: explanation                                                                                                           | The stop hook enforces intentional stops                                                                                                                                                                      | Prefix your stop message with STOPPING BECAUSE: <reason>, or keep working                                                                                                                                             |
| R-STOP-GOAL-LEDGER                          | Stopping while ledgered plan(s) are still In Progress                                                                                                      | The daemon-side goal ledger owes a goal for EVERY In Progress plan, not only the newest /goal condition                                                                                                       | Continue the listed plan(s), or stop with STOPPING BECAUSE: naming why each cannot proceed                                                                                                                            |
| R-BASH-SAFE-MODE-PRELUDE-MISSING            | a sequenced Bash invocation with no `set` safety prelude                                                                                                   | Errors in earlier statements can be silently ignored                                                                                                                                                          | Add `set -euo pipefail` at the top, or gate explicitly with `&&`/\`                                                                                                                                                   |
| R-GIT-MERGE-SQUASH                          | `git merge --squash`                                                                                                                                       | Severs ancestry -- git branch -d refuses the branch forever                                                                                                                                                   | Use git merge --no-ff instead                                                                                                                                                                                         |
| R-GH-PR-MERGE-SQUASH                        | `gh pr merge --squash`                                                                                                                                     | Severs ancestry -- git branch -d refuses the branch forever                                                                                                                                                   | Use gh pr merge --merge instead                                                                                                                                                                                       |
| R-GH-PR-MERGE-REBASE                        | `gh pr merge --rebase`                                                                                                                                     | Severs ancestry -- git branch -d refuses the branch forever                                                                                                                                                   | Use gh pr merge --merge instead                                                                                                                                                                                       |
| R-ARTIFACT-PUBLISH                          | publishing an artefact via the `Artifact` tool                                                                                                             | The page lives OUTSIDE the project and the repository cannot audit or retract it                                                                                                                              | Write the file locally and tell the user its path, or ask a human to publish                                                                                                                                          |
| R-ASK-USER-QUESTION-UNJUSTIFIED             | AskUserQuestion without `ASKING BECAUSE:` prefix                                                                                                           | Asking pauses the session for a question the daemon cannot verify was necessary                                                                                                                               | State the assumed answer in output text and proceed, or retry every question prefixed `ASKING BECAUSE: <reason>`                                                                                                      |
| R-COMMENT-CHANGELOG                         | changelog narrative in a code comment                                                                                                                      | A comment describes CURRENT STATE; history belongs elsewhere                                                                                                                                                  | Move it to git, a changelog file, or the plan's JOURNAL/                                                                                                                                                              |
| R-COMMENT-SIZE                              | a comment growing past its configured size limit                                                                                                           | Comments should describe current state, not accumulate                                                                                                                                                        | Shorten the comment, or declare MUST_EXCEED_COMMENT_SIZE_BECAUSE                                                                                                                                                      |
| R-CURL-PIPE-SHELL                           | \`curl                                                                                                                                                     | wget ...                                                                                                                                                                                                      | bash                                                                                                                                                                                                                  |
| R-CHMOD-WORLD-WRITABLE                      | `chmod 777`/`chmod a+w`/`chmod o+w`                                                                                                                        | Allows anyone to read, write, and execute, bypassing all file permission security                                                                                                                             | Use least-privilege permissions instead (755/644/600)                                                                                                                                                                 |
| R-GIT-MESSAGE-BACKTICK                      | an unescaped backtick in a double-quoted git commit/tag message                                                                                            | Bash performs command substitution inside double quotes -- the span is EXECUTED, not quoted                                                                                                                   | Use single quotes, or git commit -F <file>                                                                                                                                                                            |
| R-GIT-STASH-PUSH                            | `git stash` / `git stash push` / `git stash save`                                                                                                          | Stashes get forgotten, lost, and block git pull                                                                                                                                                               | Use git commit instead — WIP commits are fine                                                                                                                                                                         |
| R-PIP-BREAK-SYSTEM-PACKAGES                 | `pip install --break-system-packages`                                                                                                                      | Bypasses PEP 668 protection and can corrupt the system Python installation                                                                                                                                    | Use a virtual environment or `pip install --user` instead                                                                                                                                                             |
| R-PLAN-TIME-ESTIMATE                        | Time estimates not allowed in plan documents                                                                                                               | Time estimates in plans create false expectations and pressure                                                                                                                                                | Break work into concrete tasks and implementation steps; let the user decide scheduling                                                                                                                               |
| R-SECRET-READ                               | Read/Write/Edit/NotebookEdit/Grep targeting a protected path                                                                                               | The file's contents must NEVER be read into context by any route — not Read, not Bash, not an interpreter one-liner, not a copy                                                                               | Use `bin/hooks-daemon secret-meta <path>` for metadata, or ask the user                                                                                                                                               |
| R-SECRET-BASH-MENTION                       | a Bash command whose text mentions a protected path                                                                                                        | The file's contents must NEVER be read into context by any route — not Read, not Bash, not an interpreter one-liner, not a copy                                                                               | Use `bin/hooks-daemon secret-meta <path>` for metadata, or ask the user                                                                                                                                               |
| R-SECRET-SCRIPT-AUTHOR                      | a script authored via Write/Edit whose content references a protected path                                                                                 | The file's contents must NEVER be read into context by any route — not Read, not Bash, not an interpreter one-liner, not a copy                                                                               | Use `bin/hooks-daemon secret-meta <path>` for metadata, or ask the user                                                                                                                                               |
| R-SECRET-EVALUATION-ERROR                   | a call this guard could not finish evaluating                                                                                                              | An exception during evaluation is not a decision the guard actually made -- treating it as "no match" would let a genuine protected-path mention through unexamined whenever the SAME defect crashed the scan | This is a bug in the guard itself, not something to work around -- report it via the hooks-daemon skill (issue-report)                                                                                                |
| R-SEC-CODE-INJECTION                        | `eval`, `exec`, `new Function`, `__import__`, `instance_eval`, `yaml.load`                                                                                 | Dynamic execution of a string as code                                                                                                                                                                         | Avoid dynamic code execution; use safe parsing/import alternatives                                                                                                                                                    |
| R-SEC-CMD-INJECTION                         | `os.system`, `subprocess(..., shell=True)`, `shell_exec`, `proc_open`, `Runtime.exec`, `Process.Start`, `IO.popen`                                         | Shell command construction from untrusted input enables command injection                                                                                                                                     | Use argument-list APIs (no shell=True) instead of shell string concatenation                                                                                                                                          |
| R-SEC-DESERIALISATION                       | `pickle.load`, `Marshal.load`, `unserialize`, `ObjectInputStream`, `XMLDecoder`, `BinaryFormatter`                                                         | Deserialising untrusted data can execute arbitrary code                                                                                                                                                       | Use a safe serialisation format (e.g. JSON) instead                                                                                                                                                                   |
| R-SEC-XSS                                   | `innerHTML`, `dangerouslySetInnerHTML`, `document.write`, `template.HTML`/`JS`/`URL`                                                                       | Injects unescaped content into the DOM/output, enabling XSS                                                                                                                                                   | Use the framework's safe templating/escaping APIs                                                                                                                                                                     |
| R-SEC-HARDCODED-CREDS                       | AWS access keys, GitHub tokens, Stripe keys, private key blocks                                                                                            | Hardcoded credentials leak via source control history and code review                                                                                                                                         | Use environment variables, never hardcode credentials                                                                                                                                                                 |
| R-SEC-UNSAFE-MEMORY                         | Rust `from_raw_parts`, `transmute`                                                                                                                         | Bypasses Rust's memory/type safety guarantees                                                                                                                                                                 | Use safe conversions (`as`, `From`/`Into`) or validated slice operations                                                                                                                                              |
| R-SED-FILE-MODIFICATION                     | `sed`                                                                                                                                                      | Claude gets sed syntax wrong regularly and a single error can destroy hundreds of files                                                                                                                       | Use the Edit tool (or parallel Haiku agents with Edit for bulk changes)                                                                                                                                               |
| R-PGREP-SELF-MATCH                          | a `pgrep -f`/`pkill -f`/`ps`-piped-to-`grep` probe whose literal pattern matches this command's own argv                                                   | The probe always finds itself, so a wait never ends and a check always lies                                                                                                                                   | Bracket the first character (`pgrep -f '[p]rovision.bash'`), or wait on a log marker                                                                                                                                  |
| R-WAIT-ON-WRAPPER-PID                       | a wait on `$!` when the backgrounded command starts with a wrapper that forks — denied for `setsid`, advisory for `nohup sh -c`, `timeout` and `env sh -c` | `$!` is the wrapper's pid, and setsid's parent exits at once, so the wait ends immediately and reports success                                                                                                | Let the job write its own pidfile, resolve the child with `pgrep -P`, or wait on a log marker                                                                                                                         |
| R-UNBOUNDED-LIVENESS-LOOP                   | a `while`/`until` wait on a process with a sleep-only body and no cap                                                                                      | run_in_background has no time limit, so a wrong probe waits for ever                                                                                                                                          | Wrap it in `timeout 3600 bash -c '…'`, add a counter, or wait on a log marker                                                                                                                                         |
| R-PGREP-UNRESOLVED-PATTERN                  | a process probe whose pattern is built by expansion, inside a wait or a kill                                                                               | If it expands to text in this command's argv, the probe counts the caller                                                                                                                                     | Bracket the pattern where it is built, or wait on a log marker                                                                                                                                                        |
| R-SENSITIVE-PUBLIC-PATTERN                  | content matching a configured public pattern                                                                                                               | The pattern is a named, safe-to-disclose signal (a path, a placeholder, profanity, ...)                                                                                                                       | Remove or replace the matched text before retrying                                                                                                                                                                    |
| R-SENSITIVE-SECRET-TERM                     | content matching a configured blocked term                                                                                                                 | A gitignored secret word list term was found in what this call would record                                                                                                                                   | Ask the user what the cited entry covers, then remove the matching text                                                                                                                                               |
| R-SUDO-PIP-INSTALL                          | `sudo pip install`                                                                                                                                         | Conflicts with the OS package manager and can corrupt system Python                                                                                                                                           | Use a virtual environment or `pip install --user` instead                                                                                                                                                             |
| R-WRITE-CLOBBER                             | `Write` to an existing file you have not read this session                                                                                                 | You cannot know what you are destroying, so you could not report the loss even afterwards                                                                                                                     | `Read` the file then retry, or use `Edit` for a targeted change                                                                                                                                                       |
| R-DAEMON-DIR-CD                             | `cd`/`pushd` into `.claude/hooks-daemon/`                                                                                                                  | Daemon CLI commands must be run from PROJECT ROOT, causing path confusion otherwise                                                                                                                           | Run daemon commands from project root, e.g. `bin/hooks-daemon status`                                                                                                                                                 |
| R-DOCS-QA-COMMIT                            | a git commit violates a block-level docs QA staged-tree check                                                                                              | Most doc rot that matters at commit time is cross-file drift a single-file edit hook cannot see                                                                                                               | Fix the content per each finding's remediation below and amend the commit                                                                                                                                             |
| R-DOCS-QA-EDIT                              | a documentation Write/Edit violates a block-level docs QA check                                                                                            | A finding only denies the write when it is BLOCK severity AND the resolved mode for that check is block                                                                                                       | Fix the content per each finding's remediation below and retry                                                                                                                                                        |
| R-LSP-SYMBOL-LOOKUP                         | a symbol-like Grep/Bash grep lookup                                                                                                                        | LSP tools give semantic ~50ms code intelligence; grep is slow and imprecise                                                                                                                                   | Use goToDefinition/findReferences/workspaceSymbol/hover/documentSymbol instead                                                                                                                                        |
| R-MARKDOWN-WRONG-LOCATION                   | MARKDOWN FILE IN WRONG LOCATION — a new `.md` file written to an unrecognised location                                                                     | Markdown files must follow project organization rules                                                                                                                                                         | Move it into an allowed location, declare its sub-project under `projects:`, or configure `extra_allowed_markdown_paths`                                                                                              |
| R-MARKDOWN-UNTRACKED-MEMORY                 | UNTRACKED CLAUDE MEMORY IS DISABLED FOR THIS PROJECT — a write to `~/.claude/projects/*/memory/*.md`                                                       | That knowledge is per-checkout, un-reviewed, and invisible to teammates — it drifts from the repo and bypasses code review                                                                                    | Document it in tracked project docs instead (CLAUDE.md, .claude/rules/\*.md, docs/)                                                                                                                                   |
| R-MARKDOWN-PLAN-SYNC                        | a `.claude/settings.json` `plansDirectory` out of sync with the daemon's plan_workflow config                                                              | Plan workflow requires plansDirectory to match daemon config to redirect writes correctly                                                                                                                     | Fix `.claude/settings.json`'s `plansDirectory` key, then restart your session                                                                                                                                         |
| R-NPM-PIPED-COMMAND                         | a piped `npm run`/`npx` command                                                                                                                            | Piping npm/npx commands is pointless — llm: cache files hold the full data                                                                                                                                    | Run the plain command, then query the cache file with jq                                                                                                                                                              |
| R-NPM-NON-LLM-COMMAND                       | a raw `npm run`/`npx` command when llm: wrappers exist                                                                                                     | llm: commands provide LLM-friendly, machine-readable output                                                                                                                                                   | Use the project's `npm run llm:*` equivalent instead                                                                                                                                                                  |
| R-WRITE-OUTSIDE-PROJECT-ROOT                | a write whose target is outside the repository root                                                                                                        | Outside the repo nothing is version-controlled, reviewed or durable — a container's temp directory is wiped on restart, and every other path rule is scoped to the repo so none of them judges it             | Write it inside the repository — `untracked/scratch/` is the scratch location                                                                                                                                         |
| R-PROJECT-CONTAINMENT-EVALUATION-ERROR      | a call this guard could not finish evaluating                                                                                                              | An exception during evaluation is not a decision the guard actually made -- treating it as "no match" would let a genuine out-of-root write through unexamined whenever the SAME defect crashed the check     | This is a bug in the guard itself, not something to work around -- report it via the hooks-daemon skill (issue-report)                                                                                                |
| R-TDD-TEST-FIRST                            | creating a production source file without its test file                                                                                                    | TDD requires the test file to exist before the source file                                                                                                                                                    | Create the test file first (RED), then the source file (GREEN)                                                                                                                                                        |
| R-ERROR-HIDING                              | an error-hiding pattern (bare except,                                                                                                                      |                                                                                                                                                                                                               | true, empty catch, result, _ := ..., ...)                                                                                                                                                                             |
| R-FAILSAFE-CRON-SUPPRESSED                  | A delivered failsafe-cron tick, while a 'blocked only on human input' marker is live                                                                       | Every tick against a session blocked only on human input is a guaranteed no-op model turn                                                                                                                     | Nothing to do -- this is expected. Send a real message to clear the marker and resume ticks                                                                                                                           |
| R-FAILSAFE-CRON-BACKED-OFF                  | A delivered failsafe-cron tick, while this session is producing nothing and owes no ledgered work                                                          | An hourly tick against a session with nothing to recover costs a full model turn and finds nothing                                                                                                            | Nothing to do -- ticks continue, just less often. Any real user message restores hourly cadence                                                                                                                       |
| R-DECLARED-CRON-SUPPRESSED                  | A delivered persistent_crons tick, while a 'blocked only on human input' marker is live                                                                    | A declared job's tick against a session blocked only on human input costs a full model turn                                                                                                                   | Nothing to do -- this is expected. Send a real message to clear the marker and resume ticks                                                                                                                           |
| R-FLAGGABLE-CONTENT-CHANNEL                 | a content-revealing git/grep command shape over a flaggable path                                                                                           | It would reveal flaggable content inside routine command output, with no deliberate Read at all                                                                                                               | Delegate the WHOLE review to the quarantine subagent instead                                                                                                                                                          |
| R-GH-AUTO-CLOSE-KEYWORD                     | a GitHub closing keyword + issue reference in a git/gh message                                                                                             | Auto-closes the referenced issue/PR the moment the commit reaches the default branch, and cannot be disabled repository-side                                                                                  | Use a non-closing reference instead, e.g. Addresses #123                                                                                                                                                              |
| R-UPSTREAM-ISSUE-UNVERIFIED-BODY            | `gh issue create` against the hooks-daemon tracker with a body no generator produced                                                                       | that tracker is PUBLIC and an issue cannot be retracted -- a pasted config, log excerpt or absolute path costs the CLIENT permanently, while an over-redacted report costs one round trip                     | Generate the body with `hooks-daemon issue-report` and file the file it writes                                                                                                                                        |
| R-LINT-FAILURE                              | a written/authored file that fails its language's lint check                                                                                               | The write has already landed on disk; this is a failure report, not a rollback                                                                                                                                | Fix the reported problems with Edit — do not re-Write the file from scratch                                                                                                                                           |
| R-LOCK-FILE-EDIT                            | Direct `Write`/`Edit` of a package manager lock file                                                                                                       | Lock files are generated artifacts; manual edits create checksum mismatches and broken dependency graphs                                                                                                      | Use the package manager commands instead (e.g. `npm install`, `cargo update`)                                                                                                                                         |
| R-LSP-CONFIG-EXCLUDE                        | a language server config with no exclude for a tree that is not project code                                                                               | The language server reports other checkouts' and fixtures' defects against this one, and a noisy stream is skimmed                                                                                            | Add the listed exclude entries (the advisory prints them ready to use); a finding that instead names an entry as harmful means REMOVE it - follow the exact instruction printed, never assume every finding means add |
| R-LSP-SERVER-STALE                          | a running language server older than the config file its check is anchored to                                                                              | It is still analysing the scope the OLD config declared                                                                                                                                                       | End the named process (the harness respawns it on the next LSP use)                                                                                                                                                   |
| R-PIPE-TO-TAIL                              | \`                                                                                                                                                         | tail\`                                                                                                                                                                                                        | Truncates output and causes information loss                                                                                                                                                                          |
| R-PIPE-TO-HEAD                              | \`                                                                                                                                                         | head\`                                                                                                                                                                                                        | Truncates output and causes information loss                                                                                                                                                                          |
| R-JOURNAL-HAND-WRITTEN-ENTRY                | a plan journal entry written by hand (Edit/Write/Bash into a JOURNAL/ day-file)                                                                            | Only `mkplan.bash --journal` stamps the real UTC time; hand-typed stamps have landed 40 minutes in the future                                                                                                 | Write the entry body to a fresh file under untracked/scratch/, then run `mkplan.bash --journal <plan> <category> <body-file>`                                                                                         |
| R-PLAN-NUMBER-DISCOVERY                     | a bash discovery scan (ls/find/sort+tail) for the next plan number                                                                                         | Misses subdirectories like Completed/ and disagrees across branches                                                                                                                                           | Use the printed next plan number, or the git counter directly                                                                                                                                                         |
| R-PLAN-FOLDER-MKDIR                         | `mkdir <plan-dir>/NNNNN-name` (hand-creating a plan folder)                                                                                                | Claims a plan number the moment the folder appears, but nothing records the claim until PLAN.md is written                                                                                                    | Use the mkplan.bash scaffolder instead                                                                                                                                                                                |
| R-PLAN-QA-COMMIT                            | a git commit violates a block-level plan QA cross-file invariant                                                                                           | Most plan rot is cross-file and a single-file edit hook cannot see it                                                                                                                                         | Amend the commit to also stage what each finding's remediation names below                                                                                                                                            |
| R-PLAN-QA-EDIT                              | a PLAN.md/README.md Write/Edit violates a block-level plan QA check                                                                                        | Plan QA linting catches issues you can fix immediately, before they reach commit                                                                                                                              | Fix the content per each finding's remediation below and retry                                                                                                                                                        |
| R-GIT-RESET-HARD                            | `git reset --hard`                                                                                                                                         | Permanently destroys all uncommitted changes                                                                                                                                                                  | Ask the user to run it manually                                                                                                                                                                                       |
| R-GIT-CLEAN-FORCE                           | `git clean -f`                                                                                                                                             | Permanently deletes untracked files                                                                                                                                                                           | Ask the user to run it manually                                                                                                                                                                                       |
| R-GIT-CHECKOUT-DISCARD                      | `git checkout -- <file>` / `git checkout .`                                                                                                                | Discards local changes to file(s) permanently                                                                                                                                                                 | Ask the user to run it manually                                                                                                                                                                                       |
| R-GIT-RESTORE                               | `git restore <file>`                                                                                                                                       | Discards local changes to files permanently (`--staged`/`-S` is allowed)                                                                                                                                      | Ask the user to run it manually                                                                                                                                                                                       |
| R-GIT-STASH-DROP                            | `git stash drop`                                                                                                                                           | Permanently destroys a stashed change                                                                                                                                                                         | Ask the user to run it manually                                                                                                                                                                                       |
| R-GIT-STASH-CLEAR                           | `git stash clear`                                                                                                                                          | Permanently destroys all stashed changes                                                                                                                                                                      | Ask the user to run it manually                                                                                                                                                                                       |
| R-GIT-PUSH-FORCE                            | `git push --force` / `git push <remote> +<refspec>`                                                                                                        | Can overwrite remote history and destroy team members' work                                                                                                                                                   | Ask the user to run it manually, or coordinate and use `--force-with-lease`                                                                                                                                           |
| R-GIT-BRANCH-FORCE-DELETE                   | `git branch -D` / `git update-ref -d refs/heads/<name>`                                                                                                    | Force-deletes a branch without checking if it has been merged                                                                                                                                                 | Use `git branch -d` first (refuses unmerged branches); ask the user for -D                                                                                                                                            |
| R-GIT-COMMIT-AMEND                          | `git commit --amend`                                                                                                                                       | Rewrites the previous commit, creating messy history and potential data loss                                                                                                                                  | Create a new commit instead                                                                                                                                                                                           |
| R-GIT-CHECKOUT-FORCE                        | `git checkout -f` / `git checkout --force`                                                                                                                 | Discards every uncommitted change in the working tree, naming no file                                                                                                                                         | Commit or stash first; ask the user if the discard is genuinely wanted                                                                                                                                                |
| R-GIT-SWITCH-FORCE                          | `git switch -f` / `git switch --discard-changes`                                                                                                           | Discards every uncommitted change — the `switch` spelling of `checkout -f`                                                                                                                                    | Commit or stash first; `git switch <branch>` alone is never blocked                                                                                                                                                   |
| R-GIT-REFLOG-EXPIRE                         | `git reflog expire --expire=now`                                                                                                                           | Destroys the reflog, which is the recovery route the other rules assume                                                                                                                                       | Use a real expiry window (`--expire=90.days.ago`), which is not blocked                                                                                                                                               |
| R-GIT-GC-PRUNE-NOW                          | `git gc --prune=now`                                                                                                                                       | Drops unreachable objects immediately, so reflog-only history is gone                                                                                                                                         | Plain `git gc` and `git gc --auto` are not blocked; use a prune window                                                                                                                                                |
| R-GIT-FILTER-HISTORY                        | `git filter-branch` / `git filter-repo`                                                                                                                    | Rewrites every commit in the history                                                                                                                                                                          | Ask the user to run it manually, on a fresh clone with a backup ref                                                                                                                                                   |
| R-WORKTREE-FILE-COPY                        | `cp`/`mv`/`rsync` between a worktree and the main repo                                                                                                     | Defeats worktree isolation, bypasses git tracking, and can nuke untracked work in the target directory                                                                                                        | cd into the worktree, commit, then git merge back                                                                                                                                                                     |
| R-QA-SUPPRESSION                            | a QA suppression directive (noqa, type: ignore, eslint-disable, ...)                                                                                       | Suppression comments hide real problems and create technical debt                                                                                                                                             | Fix the underlying issue; do not suppress the warning                                                                                                                                                                 |
| R-QUARANTINE-ARTEFACT-READ                  | reading a quarantined `*-opus-security-DETAIL*` artefact into the coordinator                                                                              | A DETAIL artefact holds raw flaggable substance meant for a human or another quarantine agent only                                                                                                            | Read the paired `*-opus-security-SUMMARY*` artefact instead                                                                                                                                                           |
| R-QUARANTINE-ARTEFACT-READ-EVALUATION-ERROR | a call this guard could not finish evaluating                                                                                                              | An exception during evaluation is not a decision the guard actually made -- treating it as "no match" would let a genuine DETAIL-artefact read through unexamined whenever the SAME defect crashed the scan   | This is a bug in the guard itself, not something to work around -- report it via the hooks-daemon skill (issue-report)                                                                                                |
| R-REFERENCE-REPO-STALE                      | a read of a governed reference clone that is behind or off its default branch                                                                              | reasoning from a stale clone produces conclusions indistinguishable from correct ones -- no error, no failing test, just a wrong answer                                                                       | Run the `fix:` command printed beside the repo, then retry the read                                                                                                                                                   |
| R-REFERENCE-REPO-NOT-VERIFIED               | a read of a governed reference clone with no in-date freshness reading                                                                                     | nobody has checked this clone, which is a different fact from it being stale -- and treating the two the same either cries wolf or gives false comfort                                                        | Run `hooks-daemon reference-repos` to fetch every governed repo and refresh                                                                                                                                           |
| R-REMOTE-DOCS-STAGED-PROVENANCE             | a commit staging a remote-docs file without valid provenance frontmatter                                                                                   | An unattributed vendored document that reaches history needs a rewrite to remove, and cannot be refreshed, dated or trusted meanwhile                                                                         | Capture with `hooks-daemon remote-docs add <url>` and re-stage                                                                                                                                                        |
| R-REMOTE-DOCS-PROVENANCE                    | a write into the remote-docs tree without valid provenance frontmatter                                                                                     | A vendored document with no recorded source is indistinguishable from something we wrote ourselves, and cannot be refreshed, dated or trusted                                                                 | Capture with `hooks-daemon remote-docs add <url>` instead of hand-authoring                                                                                                                                           |
| R-REMOTE-DOCS-VENDORED-COPY                 | a WebFetch of a URL this project already holds a fresh vendored copy of                                                                                    | The local copy is faster, costs no network round trip, and is the corpus the remote-docs tree exists to build                                                                                                 | Read the local path named in the message, or refresh it if you need newer content                                                                                                                                     |
| R-ABSOLUTE-PATH-REQUIRED                    | `Read`/`Write`/`Edit` file_path requires absolute path                                                                                                     | Ambiguous about the current working directory and can target the wrong file                                                                                                                                   | Use an absolute path starting with /                                                                                                                                                                                  |
| R-GH-ISSUE-VIEW-NO-COMMENTS                 | `gh issue view` without `--comments`                                                                                                                       | Issue comments contain critical context, clarifications and updates not in the issue body                                                                                                                     | Add --comments, or include comments in --json fields                                                                                                                                                                  |
| R-GH-PR-VIEW-NO-COMMENTS                    | `gh pr view` without `--comments`                                                                                                                          | PR comments contain review feedback and discussion context not in the PR body                                                                                                                                 | Add --comments, or include comments in --json fields                                                                                                                                                                  |
| R-ROOT-RECURSION-CATASTROPHIC               | `grep -r`/`find`/`rg`/... rooted at `/`, `/proc`, `/sys`, `/home`, `/root`, `~`, `$HOME`                                                                   | Walks the entire filesystem and can pin every CPU core for hours                                                                                                                                              | Scope the search to the project (e.g. `rg -l "pattern" .`)                                                                                                                                                            |
| R-STAGED-LINT-FAILURE                       | a staged file fails the cheap syntax check at commit time                                                                                                  | lint_on_edit only ever runs at Write/Edit time, so a git add of pre-existing content skips it entirely                                                                                                        | Fix the failing file(s) above and re-stage before committing                                                                                                                                                          |
| R-SUBAGENT-CRON-DELETE                      | `CronDelete` called from inside a subagent                                                                                                                 | A session cron belongs to the coordinator's session, which is the session that loses coverage when it goes                                                                                                    | Report the cron id and your reasoning to the coordinator and let it decide                                                                                                                                            |
| R-SUBAGENT-FULL-QA                          | a full-suite QA run inside a sub-agent (a declared `full_qa_patterns` command)                                                                             | Concurrent full runs across agents exhaust the host, and the coordinator runs the full gate over every ready branch anyway                                                                                    | Run targeted QA on what you changed, commit, and hand the commit to the coordinator                                                                                                                                   |
| R-ESLINT-ERRORS                             | a written/authored TS/TSX file with reported ESLint errors                                                                                                 | The write has already landed on disk; this is a failure report, not a rollback                                                                                                                                | Fix the reported problems with Edit (`npx eslint <file> --fix` clears most)                                                                                                                                           |
| R-ESLINT-TIMEOUT                            | an ESLint run that did not finish within the configured timeout                                                                                            | This handler DENIES on a timeout — unlike lint_on_edit, which allows                                                                                                                                          | Investigate why ESLint is slow (config, project size); retry the edit                                                                                                                                                 |
| R-ESLINT-RUN-FAILURE                        | an ESLint invocation that failed to run at all                                                                                                             | ESLint could not be launched (exception raised invoking it)                                                                                                                                                   | Check the ESLint wrapper/tsx setup, then retry the edit                                                                                                                                                               |
| R-INSTRUCTION-IMPLEMENTATION-LOG            | implementation logs (e.g. 'created the file X', 'added the class Y')                                                                                       | Instruction files hold permanent instructions, not a log of past edits                                                                                                                                        | Remove the log sentence; put implementation history in git or a plan JOURNAL/                                                                                                                                         |
| R-INSTRUCTION-STATUS-INDICATOR              | status indicators (e.g. checkmark + 'Complete', 'Done', 'Success', 'Fixed')                                                                                | A completion emoji records a moment in time, not a permanent fact                                                                                                                                             | Remove the status marker; instruction files describe the project, not its history                                                                                                                                     |
| R-INSTRUCTION-TIMESTAMP                     | timestamps (ISO dates such as 2024-03-15)                                                                                                                  | A dated entry is a log line, and instruction files are not a log                                                                                                                                              | Remove the date; if it is genuinely load-bearing, put it in git history                                                                                                                                               |
| R-INSTRUCTION-LLM-SUMMARY                   | LLM summaries (section headings such as '## Summary', '## Key Points', '## Overview')                                                                      | A summary heading is the shape an LLM's own turn-report takes, not project documentation                                                                                                                      | Remove the heading and fold any durable content into the surrounding instructions                                                                                                                                     |
| R-INSTRUCTION-TEST-OUTPUT                   | test output counts (e.g. '42 tests passed', '1 test failed')                                                                                               | A test run's result is a point-in-time fact, not a stable instruction                                                                                                                                         | Remove the count; CI already reports this on every run                                                                                                                                                                |
| R-INSTRUCTION-FILE-LISTING                  | changelog-style file listings (e.g. 'created src/Service/Foo.php')                                                                                         | A file path preceded by a past-tense action verb is changelog narrative                                                                                                                                       | Remove the log line; a bare path reference used as documentation stays allowed                                                                                                                                        |
| R-INSTRUCTION-CHANGE-SUMMARY                | change summaries (e.g. 'Added 15 lines', 'Removed 8 lines')                                                                                                | A line-count delta describes one diff, not a stable instruction                                                                                                                                               | Remove the summary; the diff itself is preserved in git                                                                                                                                                               |
| R-INSTRUCTION-COMPLETION-INDICATOR          | completion indicators (e.g. 'ALL DONE!', 'Task complete!', 'Finished task')                                                                                | A completion phrase announces a session's end, not a fact about the project                                                                                                                                   | Remove the phrase; instruction files should never celebrate finishing a task                                                                                                                                          |
| R-VERIFICATION-RESULT-NOT-CONSUMED          | a verifier followed by a mutator with nothing consuming the result                                                                                         | The verifier can fail and the mutator would still run                                                                                                                                                         | Gate with `&&`, an explicit exit-code check, or `set -euo pipefail`                                                                                                                                                   |

## Advisories and other active handlers

One line each; these fire with their own guidance when relevant. Full text: `bin/hooks-daemon explain-handler <name>`.

<!-- handler: agent-isolation-advisor -->

- agent_isolation_advisor — isolate concurrent agents

<!-- handler: agent-terminated-early-failure-detector -->

- agent_terminated_early_failure_detector — a dead foreground sub-agent is surfaced on PostToolUseFailure

<!-- handler: auto-approve-reads -->

- auto_approve_reads — gated on bypassPermissions mode

<!-- handler: background-process-tracker -->

- background_process_tracker — backgrounded processes are tracked

<!-- handler: budget-exhaustion-detector -->

- budget_exhaustion_detector — hidden agent budgets are surfaced

<!-- handler: ccy-supervisor-integrity -->

- ccy_supervisor_integrity — keep the ccy supervisor properly set up

<!-- handler: command-hints -->

- command_hints — advisory reminders after specific commands

<!-- handler: cron-stop-enforcer -->

- cron_stop_enforcer — declared crons are verified, not just asked for

<!-- handler: cron-subagent-stop-enforcer -->

- cron_subagent_stop_enforcer — SubagentStop twin of `cron_stop_enforcer`

<!-- handler: daemon-sync-after-merge -->

- daemon_sync_after_merge — a pull can leave the daemon stale

<!-- handler: daemon-upgrade-detector -->

- daemon_upgrade_detector — a running daemon notices its own upgrade

<!-- handler: deployed-artefact-drift -->

- deployed_artefact_drift — a deployed file has moved away from its template

<!-- handler: dispatch-declaration -->

- dispatch_declaration — declare where a subagent's reports go

<!-- handler: docs-qa-sweep -->

- docs_qa_sweep — documentation drift report at session start

<!-- handler: failsafe-cron-session-advisor -->

- failsafe_cron_session_advisor — the failsafe cron from session start

<!-- handler: flaggable-work-advisor -->

- flaggable_work_advisor — delegate flaggable work BEFORE reading it

<!-- handler: git-hooks-executable-fixer -->

- git_hooks_executable_fixer — auto-fixes non-executable git hooks

<!-- handler: git-upstream-checker -->

- git_upstream_checker — additive fetch + pull/cleanup advice on session start

<!-- handler: goal-injection -->

- goal_injection — plan-start goal signal for the ccy supervisor

<!-- handler: hook-registration-checker -->

- hook_registration_checker — hooks configuration policy

<!-- handler: idle-housekeeping-advisory -->

- idle_housekeeping_advisory — report-first idle housekeeping (beta, opt-in)

<!-- handler: markdown-table-formatter -->

- markdown_table_formatter — markdown tables are auto-aligned

<!-- handler: merge-qa-report -->

- merge_qa_report — post-hoc plan/docs QA report after a merge

<!-- handler: model-downgrade-recorder -->

- model_downgrade_recorder — the automatic model downgrade is written down

<!-- handler: model-fallback-detector -->

- model_fallback_detector — silent model substitution is surfaced

<!-- handler: nitpick-dismissive-language -->

- nitpick.dismissive_language — do not deflect or prematurely halt

<!-- handler: nitpick-hedging-language -->

- nitpick.hedging_language — the guessing is the defect, not the wording

<!-- handler: persistent-cron-assertor -->

- persistent_cron_assertor — declared crons are re-established each session

<!-- handler: plan-qa-sweep -->

- plan_qa_sweep — plan-tree drift report at session start

<!-- handler: plan-status-snapshot -->

- plan_status_snapshot — pre-write PLAN.md status snapshot

<!-- handler: plan-workflow-asset-checker -->

- plan_workflow_asset_checker — plan tooling provisioning alert

<!-- handler: plan-workflow-guidance -->

- plan_workflow — PLAN.md, supporting docs and JOURNAL/ obey DIFFERENT contracts

<!-- handler: project-handler-load-checker -->

- project_handler_load_checker — project protection degraded alert

<!-- handler: recovery-cron-advisor -->

- recovery_cron_advisor — failsafe recovery cron lifecycle advisory

<!-- handler: reference-repo-sweep -->

- reference_repo_sweep — reference clones are made fresh before you read them

<!-- handler: routine-qa-sweep -->

- routine_qa_sweep — recurring work that has stopped recurring

<!-- handler: secret-file-hygiene-checker -->

- secret_file_hygiene_checker -- on-disk hygiene for protected paths

<!-- handler: session-actions-directive -->

- session_actions_directive — the must-do list is delivered as a turn

<!-- handler: standing-authorisations -->

- standing_authorisations — a project can record a standing request

<!-- handler: subagent-report-path-verifier -->

- subagent_report_path_verifier — a claimed report path must exist

<!-- handler: subagent-report-persistence -->

- subagent_report_persistence — every sub-agent reply is saved to a file

<!-- handler: subagent-report-size-blocker -->

- subagent_report_size_blocker — write large reports to a file

<!-- handler: tool-disable-advisor -->

- tool_disable_advisor — declared never-want tools are checked at session start

<!-- handler: worktree-create -->

- worktree_create — semantic worktree naming

</hooksdaemon>
