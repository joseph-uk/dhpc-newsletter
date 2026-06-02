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

## absolute_path — always use absolute paths

The `Read`, `Write`, and `Edit` tools require absolute paths. Relative paths are blocked.

- **Correct**: `/workspace/src/main.py`, `/workspace/tests/test_utils.py`
- **Blocked**: `src/main.py`, `./config.yaml`, `../other/file.txt`

The working directory is `/workspace`. Prepend `/workspace/` to any relative path before calling these tools.

## ask_user_question_blocker — questions need `ASKING BECAUSE:` justification

AskUserQuestion calls are only allowed when every `question` string begins with `ASKING BECAUSE:` (case-sensitive, leading whitespace OK). The convention mirrors the Stop handler's `STOPPING BECAUSE:` pattern — explicit declared intent gates the privilege of pausing the session.

**Before asking, evaluate critically**:
- Tautological/rhetorical questions with one obvious answer ("Should I continue?", "Would you like me to proceed?") — do NOT ask. State the question and your assumed-correct answer in plain output text and proceed. The user is watching and will interrupt if the assumption is wrong.
- Questions whose options reduce to **good vs. bad** are tautological — the answer is always the good option. Examples: best practice vs. bodge, increasing vs. decreasing code quality, delivering the requirement vs. not delivering it, fixing the failing test vs. leaving it broken, following project conventions vs. inventing your own. Do NOT ask; pick the good option and proceed.
- Errors with a clear recovery path ("Should I fix the failing test?") — do NOT ask. Fix it.
- Genuine choice questions where you cannot resolve the answer from context — these are the legitimate use case. Prefix every question text with `ASKING BECAUSE: <one-line reason you cannot decide>` so the daemon allows the call through.

**Audit log pattern** (preferred for tautological questions):
```
I would normally ask: <question>.
Assumed answer: <your assumption>.
Proceeding on that basis; the user will interrupt if wrong.
```

**Escape hatch** (genuine ambiguity): prefix every question text with `ASKING BECAUSE: <reason>`. Mixing prefixed and non-prefixed questions in one call still triggers a block — prefix all or none.

## curl_pipe_shell — never pipe curl/wget to bash/sh

Piping network content directly to a shell is blocked. It executes untrusted remote code without any inspection.

**Blocked**: `curl URL | bash`, `curl URL | sh`, `wget URL | bash`, `curl URL | sudo bash`

**Safe alternative**: download first, inspect, then execute:
```
curl -o /tmp/script.sh URL
cat /tmp/script.sh          # inspect
bash /tmp/script.sh         # execute if safe
```

## daemon_location_guard — do not cd into .claude/hooks-daemon/

Bash commands that change directory into `.claude/hooks-daemon/` (or `cd` into a daemon-internal subdirectory and then run something) are blocked. The daemon is an upstream dependency that must remain untouched in client repos.

**Run daemon CLI from the project root instead** — it always works regardless of cwd:

```
$PYTHON -m claude_code_hooks_daemon.daemon.cli status
$PYTHON -m claude_code_hooks_daemon.daemon.cli restart
$PYTHON -m claude_code_hooks_daemon.daemon.cli logs
```

If you need to inspect daemon source for debugging, use `Read` from the project root with the absolute path — never `cd` in. Do NOT edit anything inside `.claude/hooks-daemon/`; changes will be overwritten on the next upgrade.

## dangerous_permissions — chmod 777 is blocked

`chmod 777` and other world-writable permission commands are blocked. Overly permissive file permissions are a security vulnerability.

**Blocked**: `chmod 777`, `chmod 666`, `chmod a+w`, `chmod o+w`

**Use least-privilege permissions instead**:
- Executable scripts: `chmod 755` (owner rwx, group/other rx)
- Regular files: `chmod 644` (owner rw, group/other r)
- Private files: `chmod 600` (owner rw only)

## destructive_git — blocked git commands

The following git commands are permanently blocked and will always be denied:

| Command | Reason |
|---------|--------|
| `git reset --hard` | Permanently destroys all uncommitted changes |
| `git clean -f` | Permanently deletes untracked files |
| `git checkout -- <file>` | Discards all local changes to that file |
| `git restore <file>` | Discards local changes (`--staged` is allowed) |
| `git stash drop` | Permanently destroys stashed changes |
| `git stash clear` | Permanently destroys all stashes |
| `git push --force` | Can overwrite remote history and destroy teammates' work |
| `git branch -D` | Force-deletes branch without checking if merged (lowercase `-d` is safe) |
| `git commit --amend` | Rewrites the previous commit — create a new commit instead |

If the user needs to run one of these, ask them to do it manually. Do not attempt to work around the block.

**Safe alternatives**: `git stash` (recoverable), `git diff` / `git status` (inspect first), `git commit` (save changes permanently first).

## error_hiding_blocker — error-suppression patterns are blocked

Writing code that silently swallows errors is blocked. All errors must be handled explicitly.

**Blocked patterns (examples)**:
- Python: bare `except` clauses with an empty body, catching and discarding all exceptions
- Shell: redirecting stderr to `/dev/null` to silence failures, `|| true` to suppress non-zero exit codes
- JavaScript/TypeScript: empty `catch` blocks that swallow exceptions
- Go: `_ = err` (discarding error return values without handling)

**Required action**: Handle errors explicitly — log them, return them to the caller, or propagate them. Silent error suppression masks bugs and makes debugging impossible.

## gh_issue_comments — always include --comments on gh issue view

`gh issue view` without `--comments` is blocked. Issue comments often contain critical context, clarifications, and updates not in the issue body.

**Blocked**: `gh issue view 123`, `gh issue view 123 --repo owner/repo`

**Allowed**: `gh issue view 123 --comments`, `gh issue view 123 --json title,body,comments`

If using `--json`, include `comments` in the field list instead of adding `--comments`.

## gh_pr_comments — always include --comments on gh pr view

`gh pr view` without `--comments` is blocked. PR comments often contain review feedback, reviewer requests, and decisions not in the PR body.

**Blocked**: `gh pr view 123`, `gh pr view 123 --repo owner/repo`

**Allowed**: `gh pr view 123 --comments`, `gh pr view 123 --json title,body,comments`

If using `--json`, include `comments` in the field list instead of adding `--comments`.

## git_stash — git stash is blocked by default

`git stash`, `git stash push`, and `git stash save` are blocked. `git stash pop`, `git stash apply`, `git stash list`, and `git stash show` are always allowed.

**Why**: stashes get forgotten, lost, and block `git pull`. Use `git commit -m 'WIP: ...'` instead — WIP commits are acceptable.

**Escape hatch** (when commit truly won't work):
```
MUST_STASH_BECAUSE="explain why"; git stash
```

Configure via `handlers.pre_tool_use.git_stash.options.mode: warn` for advisory-only mode.

## lock_file_edit_blocker — never directly edit lock files

Direct `Write` or `Edit` to package manager lock files is blocked. Lock files are generated artifacts; manual edits create checksum mismatches and broken dependency graphs.

**Blocked files**: `composer.lock`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `Gemfile.lock`, `Cargo.lock`, `go.sum`, `Package.resolved`, `Pipfile.lock`, and others.

**Use package manager commands instead**:
- PHP: `composer install` / `composer require package`
- Node: `npm install` / `yarn add package`
- Ruby: `bundle install` / `bundle add gem`
- Rust: `cargo add crate`
- Go: `go get module`

## lsp_enforcement — use LSP tools for code symbol lookups

Using `Grep` or `Bash` (grep/rg) to find class definitions, function signatures, or symbol references is blocked or redirected to LSP tools, which are faster and semantically accurate.

**Prefer LSP tools for**:
- Finding where a class or function is defined → `goToDefinition`
- Finding all usages of a symbol → `findReferences`
- Getting type information or documentation → `hover`
- Listing all symbols in a file → `documentSymbol`
- Searching symbols across the project → `workspaceSymbol`

**Grep/Bash grep is still appropriate for**: text patterns in content, log searching, finding strings in config files.

Default mode (`block_once`): the first symbol-lookup grep in a session is denied with guidance; subsequent retries are allowed.

## markdown_organization — markdown files must go in allowed locations

Writing a new `.md` file to an unrecognised location is blocked. Markdown files must be placed in project-configured allowed paths.

**Common allowed locations**: `CLAUDE/`, `docs/`, `RELEASES/`, `CLAUDE/Plan/`, root-level `README.md`, or any path matching the `allowed_markdown_paths` config.

**Dependency directories**: `vendor/` (PHP) and `node_modules/` (JS) are treated as implicit monorepos — each package is a sub-project where normal markdown rules apply (e.g. `vendor/acme/lib/docs/guide.md` is allowed, `vendor/acme/lib/random/notes.md` is blocked).

**Plan file redirection**: when `track_plans_in_project` is enabled, Claude Code planning mode writes are automatically redirected to the project's `CLAUDE/Plan/` directory. Plan folders must follow the `NNNN-description/` naming convention.

If you need a markdown file in a new location, add a pattern to `allowed_markdown_paths` in `.claude/hooks-daemon.yaml`.

If your project has sub-projects with their own `docs/`, `CLAUDE/`, etc., configure `monorepo_subproject_patterns` in `.claude/hooks-daemon.yaml` so normal rules apply within each sub-project.

## npm_command — use llm: prefixed npm commands

Direct `npm run` and `npx` commands are blocked or advised against. Projects with `llm:` prefixed scripts in `package.json` should use those instead.

**Why**: `llm:` commands are configured for LLM-friendly output (no spinners, no colour codes, structured results).

**Example**: Use `npm run llm:build` instead of `npm run build`.

If no `llm:` commands exist in `package.json`, the handler operates in advisory mode (warns but does not block).

## pip_break_system — --break-system-packages is blocked

`pip install --break-system-packages` (and the `pip3` / `python -m pip` / `python3 -m pip` variants) is blocked. The flag bypasses PEP 668 system-package protection and corrupts the system Python environment in containers and on modern Linux distros.

**Use a virtualenv or `--user` install instead**:

```
python3 -m venv /tmp/venv && /tmp/venv/bin/pip install <package>
# or
pip install --user <package>
```

If a tool's installer insists on `--break-system-packages` (some quick-start scripts do), download it first, inspect, and run it inside a venv — do not shortcut by adding the flag.

### Pipe Blocker

Commands piped to `tail` or `head` are **blocked** — piping truncates output and causes information loss.

**Use a temp file instead:**

```bash
# WRONG — blocked:
pytest tests/ 2>&1 | tail -20

# RIGHT — redirect to temp file:
pytest tests/ > /tmp/pytest_out.txt 2>&1
# Then read selectively if needed
```

**Allowed** (whitelisted): `grep`, `rg`, `awk`, `sed`, `jq`, `ls`, `cat`, `git log`, `git tag`, `git branch`, and other cheap filtering commands.

**Add to whitelist** (if safe to pipe): set `extra_whitelist` in `.claude/hooks-daemon.yaml` under `pipe_blocker`.

## qa_suppression — QA suppression annotations are blocked

Writing QA suppression directives into source files is blocked across all supported languages. Fix the underlying code issue instead.

**Blocked annotation types (by language)**:
- Python: `noqa` directives, `type: ignore` annotations
- JavaScript/TypeScript: `eslint-disable` inline directives
- Go: `nolint` directives (golangci-lint)
- PHP: `phpstan-ignore`, `psalm-suppress` annotations
- Java/Kotlin: `@SuppressWarnings`, `@Suppress` annotations
- C#: `pragma warning disable` directives
- Rust: `allow(clippy::...)` attributes on type-level items

**Required action**: Fix the code so QA passes without suppression. If a suppression is genuinely necessary, ask the user to add it manually — this signals a conscious decision rather than a shortcut.

## security_antipattern — OWASP security antipatterns are blocked

Writing code that contains security antipatterns is blocked across all supported languages. Fix the code to use safe patterns instead.

**Blocked categories**:
- SQL injection: building queries via string concatenation (use parameterised queries)
- Command injection: passing unvalidated input to subprocess (use argument lists)
- Hardcoded credentials: API keys, passwords, tokens embedded in source code
- Weak cryptography: MD5 or SHA1 for password hashing (use bcrypt/argon2)
- Path traversal: unvalidated user input used in file paths

**Supported languages**: Python, JavaScript/TypeScript, Go, PHP, Ruby, Java, Kotlin, C#, Rust, Swift, Dart.

## sed_blocker — sed is forbidden for file modification

`sed` is blocked because Claude gets sed syntax wrong and a single error can silently destroy hundreds of files with no recovery possible.

**Blocked**:
- `sed -i` / `sed -e` (in-place file editing via Bash tool)
- `grep -rl X | xargs sed -i` (mass file modification)
- Shell scripts (`.sh`/`.bash`) written via Write tool that contain `sed`

**Allowed** (read-only, no file modification):
- `cat file | sed 's/x/y/' | grep z` (pipeline transforming stdout only)
- `sed` mentioned in commit messages, PR bodies, or `.md` documentation files

**Use instead**:
- `Edit` tool — safe, atomic, verifiable
- Parallel Haiku agents with `Edit` tool for bulk changes across many files:
  1. Identify all files to update
  2. Dispatch one Haiku agent per file
  3. Each agent uses the `Edit` tool (never `sed`)

## sudo_pip — sudo pip install is blocked

`sudo pip install` (and the `sudo pip3` / `sudo python -m pip` / `sudo python3 -m pip` variants) is blocked. Installing as root corrupts the system Python managed by the OS package manager and creates permission/ownership issues that are painful to recover from.

**Use a virtualenv or `--user` install instead**:

```
python3 -m venv /tmp/venv && /tmp/venv/bin/pip install <package>
# or
pip install --user <package>
```

Even in a container running as root, `sudo` adds nothing — drop it and use a venv.

## tdd_enforcement — test file must exist before source file

Creating a production source file is blocked until a corresponding test file exists.

**TDD workflow (required)**:
1. Create the **test file first** (e.g. `tests/unit/handlers/test_my_handler.py`)
2. Write failing tests — RED phase
3. Create the source file and implement until tests pass — GREEN phase
4. Refactor — REFACTOR phase

**Supported languages**: Python, Go, JavaScript/TypeScript, PHP, Rust, Java, C#, Kotlin, Ruby, Swift, Dart

**Test file locations checked** (any satisfies the block):
- Separate mirror: `tests/unit/{subdir}/test_{module}.py`
- Collocated: `{source_dir}/{module}.test.ts` (JS/TS projects)
- Test subdirectory: `{source_dir}/__tests__/{module}.test.ts`

**Allowed through without blocking**: vendor dirs, node_modules, build outputs, generated files, and file extensions not in the supported language list.

## validate_instruction_content — CLAUDE.md and README.md must have stable content

Writing ephemeral or session-specific content to `CLAUDE.md` or `README.md` is blocked. These files should contain only stable instructions, not implementation logs or session state.

**Blocked content types**:
- Timestamps and ISO dates
- Status emoji followed by completion words (e.g. checkmark + 'Done')
- Implementation log sentences ('created the file X', 'added the class Y')
- Test output counts ('3 tests passed')
- LLM summary section headings ('## Summary', '## Key Points')

Content inside markdown code blocks is exempt from validation.

## worktree_file_copy — do not copy files between worktrees and the main repo

`cp`, `mv`, and `rsync` operations that move files from a worktree directory (`untracked/worktrees/` or `.claude/worktrees/`) into the main repo (`src/`, `tests/`, `config/`) — or vice versa — are blocked.

Worktrees are isolated branches. Cross-copying corrupts that isolation and can silently overwrite in-progress work.

**Allowed**: operations within the same worktree branch. **To merge changes**: use `git merge` or `git cherry-pick` instead.

## markdown_table_formatter — markdown tables are auto-aligned

After every `Write` or `Edit` of a `.md` or `.markdown` file, the content is re-formatted via `mdformat + mdformat-gfm` so that table pipes are aligned and column widths are consistent. The handler is non-terminal and advisory — it never blocks, it just rewrites the file on disk.

**What changes:**

- Table pipes are aligned vertically and delimiter rows widened to match cell widths.
- Ordered lists keep consecutive numbering (`1.` `2.` `3.`).
- `---` thematic breaks are preserved (mdformat's 70-underscore default is post-processed back).
- Asterisks in table cells are escaped (`*` → `\*`) as required by GFM.

**Ad-hoc formatting of existing files:**

```
$PYTHON -m claude_code_hooks_daemon.daemon.cli format-markdown <path>
```

## hook_registration_checker — hooks configuration policy

On every new session this handler audits hook configuration across `.claude/settings.json` and `.claude/settings.local.json`. When it reports issues, fix them — do not ignore the warning.

### Policy

1. **All hooks live in `settings.json`.** That file is tracked in version control, visible to teammates, and is the single source of truth for the daemon.
2. **`settings.local.json` must contain ZERO `hooks` entries.** It exists for per-developer `permissions` and IDE state only. A `hooks` block there is either (a) invisible to the rest of the team, or (b) duplicated with `settings.json` — in which case the hook fires twice per event.
3. **Hook commands must invoke the daemon wrapper.** Every registered command must end with `/.claude/hooks/{event}`. Anything else (inline Python, custom shell scripts, bespoke paths) is a legacy setup that bypasses the daemon entirely.

### Remediation

- **Hooks in `settings.local.json`**: move each `hooks` entry to `settings.json`, then delete the `hooks` key from `settings.local.json`. Confirm no duplicates remain.
- **Legacy-style commands**: replace them with a project-level handler. Run `$PYTHON -m claude_code_hooks_daemon.daemon.cli init-project-handlers` to scaffold `.claude/project-handlers/`, port the logic into a handler class, then restore the daemon wrapper in `settings.json`. The daemon will auto-discover the new handler on restart.
- **Missing hooks**: the daemon's installer writes the full set. If any are missing, re-run `install.py` or manually add the missing `{event_name}` entry pointing at `"$CLAUDE_PROJECT_DIR"/.claude/hooks/{bash-key}`.
- **Duplicate hooks**: a hook registered in both files fires twice. Keep the `settings.json` entry, delete from `settings.local.json`.

## auto_approve_reads — gated on bypassPermissions mode

Read-only tool permission requests (`Read`, `Glob`, `Grep`) are auto-approved **only** when Claude Code reports `permission_mode == "bypassPermissions"` (YOLO mode).

In every other mode (`default`, `plan`, `acceptEdits`, `dontAsk`) the handler defers and Claude Code's normal approval prompt is shown — the user has not opted out of per-tool approvals, so the daemon must not silently approve on their behalf.

If a permission prompt for `Read` appears in `default` mode, that is correct behaviour — approve it via Claude Code's UI.

### Stop Explanation Required

Before stopping, **prefix your final message** with `STOPPING BECAUSE:` followed by a clear reason:

```
STOPPING BECAUSE: all tasks complete, QA passes, daemon restart verified.
```

**Why**: The stop hook enforces intentional stops. Stopping without an explanation triggers an auto-block that asks you to explain or continue.

**Alternatives**:
- `STOPPING BECAUSE: <reason>` — stops cleanly with explanation
- Continue working — no need to stop unless all work is genuinely complete

**Do NOT**:
- Stop mid-task without explanation
- Ask confirmation questions and then stop (the hook auto-continues those)
- Use `AUTO-CONTINUE` unless you intend to keep working indefinitely

**Before asking a question, evaluate it critically**:
- Tautological/rhetorical questions with obvious answers ("Should I continue?", "Would you like me to proceed?") — do NOT ask, just do it
- Errors with a clear next step ("The test failed, should I fix it?") — do NOT ask, just fix it
- Genuine choice questions where all options are valid ("Which of A, B, or C should we use?") — these deserve a response. Use `STOPPING BECAUSE: need user input` and ask your question

**Recovering from a `tool_use_error` — do NOT stop silently**:

Some tool errors require an explicit recovery action, not a halt. The most common shape:
- You call `Edit` or `Write` on a file you have not yet read.
- Claude Code returns a `tool_use_error` (e.g. "File has not been read yet").
- The correct recovery is **Read the file, then retry Edit/Write** — **do not stop**. Stopping silently after a tool error triggers a Stop-hook re-entry loop and wastes a turn.

**Rule: Read before Edit/Write.** If you must edit a file you have not read, Read it first in the same turn. The daemon's Stop handler will detect a `tool_use_error` followed by a silent stop and re-fire to force recovery.

**On Stop hook re-entry (the hook fires again after a prior block)**: your next response is treated like any other — it must either prefix with `STOPPING BECAUSE:` or continue the work. Re-entry does not exempt you from the explanation rule.

## dismissive_language_detector — do not deflect or prematurely halt

Stop-time advisory that fires on language patterns signalling avoidance of work. The handler does NOT block the stop, but injects context for the next turn so the agent self-corrects.

**Avoid**:

- Dismissing issues as `pre-existing`, `out of scope`, `not our problem`,   or `not relevant` to deflect work that is in fact yours.
- Premature-halt phrasing like `natural checkpoint`, `ready to continue on your   cue`, `pausing here` mid-plan when there is more to do — finish the task   rather than dressing up a halt.
- Speculative `should be fine` or `probably works` when verification is   cheap (run the test, read the file).

**Do**: acknowledge the issue, fix it, or — if it genuinely is out of scope — say so once with the specific reason and continue with the in-scope work.

</hooksdaemon>
