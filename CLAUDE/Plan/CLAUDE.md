# Plan Lifecycle

## Directory Structure

```
CLAUDE/Plan/
  README.md              # Index of all plans (this file's parent)
  CLAUDE.md              # This file - lifecycle instructions
  NNNNN-description/     # Active plans (5-digit zero-padded)
    PLAN.md              # Plan document with tasks and status
  Completed/
    NNNNN-description/   # Completed plans (moved here when done)
```

## Plan Lifecycle

### 1. Create

- Run `CLAUDE/Plan/mkplan.bash "description"` — it allocates the next number and scaffolds `CLAUDE/Plan/NNNNN-description/` with `PLAN.md` and `JOURNAL/`
- Fill in `PLAN.md` with tasks, goals, and status
- Add entry to `README.md` under **Active Plans** in the same commit that creates the folder

### 2. Execute

- Work through tasks
- Update task status in `PLAN.md` as you go
- Reference plan in commits: `Plan NNNNN: Description`

### 3. Complete

When all tasks are done:

1. Update plan status to `Complete` (cite the delivery commit hash, not a date)
2. Move folder to `CLAUDE/Plan/Completed/NNNNN-description/`
3. Update `README.md`: remove from Active, add to Completed, update stats
4. Commit the move

```bash
git mv CLAUDE/Plan/NNNNN-desc CLAUDE/Plan/Completed/NNNNN-desc
```
