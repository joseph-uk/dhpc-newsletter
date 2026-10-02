# Plan Workflow

**Read first:** [CLAUDE/core/PlanWorkflow.core.md](core/PlanWorkflow.core.md) — the daemon's core
planning guidance (directory layout, plan numbering, `PLAN.md` structure, status values,
task grammar, journalling). It is the baseline everything below extends.

That file is DAEMON-owned: it is overwritten wholesale on every daemon upgrade, so never
edit it and never copy its content here.

Plan lifecycle (create, execute, complete and archive) is in [Plan/CLAUDE.md](Plan/CLAUDE.md).

## Project-specific additions

### Supporting Documents

Additional `.md` files in a plan folder can cover:

- `ARCHITECTURE.md` — system design decisions and rationale
- `COMPONENTS.md` — UI component breakdown
- `API.md` — API design
- `RISKS.md` — known risks and mitigations
- `RESEARCH.md` — investigation notes
