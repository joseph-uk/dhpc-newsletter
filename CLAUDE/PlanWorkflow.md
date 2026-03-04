# Plan Workflow

This document describes the planning workflow for this project.

## Directory Structure

```
CLAUDE/
  PlanWorkflow.md       ← this file
  Plan/
    00001/              ← zero-padded 5-digit plan number
      PLAN.md           ← required: main plan document
      *.md              ← optional: supporting docs (ARCHITECTURE.md, COMPONENTS.md, etc.)
    00002/
      PLAN.md
      ...
```

## Plan Numbering

Plans are numbered sequentially with zero-padded 5-digit integers: `00001`, `00002`, etc.
Each plan lives in its own folder under `CLAUDE/Plan/`.

## PLAN.md Front Matter

Every `PLAN.md` must begin with YAML front matter:

```yaml
---
id: "00001"
title: "Short descriptive title"
status: draft | active | in-progress | complete | abandoned
created: YYYY-MM-DD
updated: YYYY-MM-DD
author: "Claude / human name"
priority: low | medium | high | critical
tags: [tag1, tag2]
---
```

## Statuses

| Status | Meaning |
|--------|---------|
| `draft` | Being written, not yet approved for implementation |
| `active` | Approved, ready to begin |
| `in-progress` | Implementation underway |
| `complete` | All tasks done, deployed/merged |
| `abandoned` | Cancelled or superseded |

## Task Tracking

Tasks within a plan use GitHub-flavoured markdown checkboxes:

```markdown
- [ ] Task not started
- [~] Task in progress
- [x] Task complete
- [!] Task blocked
```

Each task should include:
- Clear actionable description
- Acceptance criteria where non-obvious
- Owner if assigned (optional)
- Blocking/blocked-by notes if relevant

## Supporting Documents

Additional `.md` files in a plan folder can cover:
- `ARCHITECTURE.md` — system design decisions and rationale
- `COMPONENTS.md` — UI component breakdown
- `API.md` — API design
- `RISKS.md` — known risks and mitigations
- `RESEARCH.md` — investigation notes

## Creating a New Plan

1. Find the next available number (`ls CLAUDE/Plan/ | sort | tail -1`)
2. `mkdir CLAUDE/Plan/NNNNN`
3. Create `PLAN.md` with required front matter
4. Add supporting docs as needed
5. Set status to `draft`, review with team, then move to `active`

## Updating Plans

- Update `updated:` date in front matter on every significant change
- Never delete completed tasks — mark them `[x]`
- Add new tasks discovered during implementation
- Keep the status current
