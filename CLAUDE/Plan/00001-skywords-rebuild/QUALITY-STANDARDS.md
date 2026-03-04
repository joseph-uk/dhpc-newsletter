# Quality Standards — Plan 00001

This project is a public showcase of high-quality AI-driven coding. Every file must meet these standards.

Derived from [ltscommerce.dev](https://ltscommerce.dev) articles on TypeScript strictness, fail-fast programming, defensive programming, and static analysis best practices.

---

## Principle 1: TypeScript Maximum Strictness

**Source**: [TypeScript's Honesty System](https://ltscommerce.dev/articles/typescript-honesty-system)

TypeScript's type system is an "honesty system" — it provides compile-time static analysis but zero runtime enforcement. Without strict configuration and ESLint enforcement, types are suggestions, not guarantees.

### tsconfig.json — All Strict Flags

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

`strict: true` enables: `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitAny`, `noImplicitThis`, `alwaysStrict`, `useUnknownInCatchVariables`.

The additional flags close loopholes that `strict` misses.

### ESLint — Block Every Bypass

```javascript
// eslint.config.js rules
{
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-unsafe-assignment": "error",
  "@typescript-eslint/no-unsafe-argument": "error",
  "@typescript-eslint/no-unsafe-return": "error",
  "@typescript-eslint/no-unsafe-member-access": "error",
  "@typescript-eslint/no-unsafe-call": "error",
  "@typescript-eslint/no-non-null-assertion": "error",
  "@typescript-eslint/consistent-type-assertions": ["error", {
    "assertionStyle": "never"
  }],
  "no-eval": "error",
  "no-new-func": "error",
  "no-implied-eval": "error"
}
```

### What To Do Instead

| Banned pattern | Use instead |
|---------------|-------------|
| `value as Type` | Type guard function: `function isType(v: unknown): v is Type` |
| `any` | `unknown` with narrowing |
| `JSON.parse(str)` | Parse, then validate with a type guard |
| `obj!.prop` | `if (obj === null) throw new Error(...)` |
| `@ts-ignore` | Fix the type error properly |

---

## Principle 2: Fail Fast

**Source**: [Fail Fast Programming](https://ltscommerce.dev/articles/fail-fast-programming-philosophy)

When code encounters invalid data, missing dependencies, or violated assumptions, it must stop immediately with clear diagnostic information.

### Guard Clause Pattern

```typescript
// WRONG: defensive programming, silent defaults
function processDoc(url: string | undefined): DocData {
  const safeUrl = url ?? '';
  if (safeUrl) {
    // nested logic...
  }
  return emptyDoc; // silent fallback
}

// RIGHT: fail fast with guard clauses
function processDoc(url: string): DocData {
  if (url.length === 0) {
    throw new Error('processDoc: url must not be empty');
  }
  // happy path at base indentation
  const html = fetchDoc(url);
  return parseDoc(html);
}
```

### Rules

- Validate at function entry, throw on invalid input
- Never return fallback/default values that mask errors
- Every `catch` block must rethrow, log with context, or handle explicitly — never empty
- Error messages must say what was expected, what was received
- Never use `|| true`, `?? ''`, `?? 0`, `?? []` to hide missing data
- Never suppress stderr or use `2>/dev/null`

---

## Principle 3: YAGNI

**Source**: [Defensive Programming Principles](https://ltscommerce.dev/articles/defensive-programming-principles)

Build only what is needed right now. No speculative features, no premature abstractions.

### Rules

- If it's not in the plan, don't build it
- No abstract base classes for things with one implementation
- No factory/strategy/builder patterns unless there are genuinely multiple implementations
- No configuration systems for values that don't change
- Three similar lines of code is better than a premature abstraction
- "Yagni only applies to capabilities built into the software to support a presumptive feature, it does not apply to effort to make the software easier to modify" — Martin Fowler

### What IS Allowed

Good architecture and clean code are not YAGNI violations:
- Clear interfaces between modules
- Proper error handling
- Type safety
- Descriptive naming

---

## Principle 4: Early Returns

**Source**: [Early Return Patterns](https://ltscommerce.dev/articles/early-return-patterns-cleaner-code)

Guard clauses handle exceptional cases first. Only after all prerequisites pass does execution reach the main logic.

### Rules

- Never nest more than 2 levels deep (excluding function body)
- Happy path runs at base indentation
- Each guard clause validates one thing and exits
- Functions under 30 lines — extract if longer

```typescript
// WRONG: pyramid of doom
function handleNav(index: number, sections: Section[]): number | null {
  if (sections.length > 0) {
    if (index >= 0) {
      if (index < sections.length) {
        return index;
      } else {
        return null;
      }
    } else {
      return null;
    }
  } else {
    return null;
  }
}

// RIGHT: early returns
function handleNav(index: number, sections: Section[]): number | null {
  if (sections.length === 0) return null;
  if (index < 0) return null;
  if (index >= sections.length) return null;
  return index;
}
```

---

## Principle 5: Defence Before Fix

**Source**: [Defence Before Fix](https://ltscommerce.dev/articles/defence-before-fix-static-analysis)

When a bug is found, the first question is: "Can a machine detect this pattern automatically?" If yes, write the lint rule before writing the fix.

### Quality Hierarchy (each layer must pass before the next)

1. **Static analysis** — TypeScript strict mode + ESLint
2. **Build verification** — `npm run build` with zero errors
3. **Manual testing** — verify with the real Google Doc

### Application to This Project

- TypeScript strict config catches type-level bugs
- ESLint rules catch `any` leaks, unsafe assertions, error hiding
- `npm run build` is the final gate — zero errors, zero warnings
- Every bug found during QA should prompt: "Can we add a lint rule for this?"

---

## Principle 6: Anti-Overfitting

**Source**: [The Overfitting Trap](https://ltscommerce.dev/articles/llm-overfitting-trap)

AI-generated code tends to "overfit" — fixing the exact test case while breaking generic functionality. This is the highest-risk failure mode for this project.

### Rules

- Every fix must address the **category** of problem, not just the specific case
- No hardcoded values that should be parameters
- No `if (input === 'specific_value')` special cases
- Preserve generic functionality — never replace broad logic with narrow patches
- When fixing a parser bug: test with multiple different Google Docs, not just the example
- If a fix only works for one specific input, it is wrong

### Self-Check Questions

Before committing any fix, ask:
1. Does this work for inputs I haven't tested?
2. Did I preserve the original function's generality?
3. Are there hardcoded values that should be parameters?
4. Would this break if the Google Doc structure varied slightly?

---

## Principle 7: Domain Purity

**Source**: [Defensive Programming Principles](https://ltscommerce.dev/articles/defensive-programming-principles)

Separate business logic from infrastructure. Domain objects contain only logic and state — never side effects.

### Application to This Project

| Layer | Contains | Does NOT contain |
|-------|----------|------------------|
| `src/types/` | Interfaces, type definitions | Logic, imports from React |
| `src/services/` | Pure functions: parsing, URL handling, fetch | React hooks, DOM manipulation, component state |
| `src/components/` | UI rendering, event handlers | Data fetching, parsing logic, business rules |
| `src/App.tsx` | Orchestration: connects services to components | Direct DOM manipulation, parsing logic |

- `docParser.ts` uses `DOMParser` (browser API) but is otherwise pure: string in, `DocData` out
- `fetchDoc.ts` does one thing: fetch a URL, return HTML string
- `urlParams.ts` does one thing: read/write the URL hash
- Components receive data via props and call callbacks — no side effects in render

---

## Principle 8: Mocking Discipline

**Source**: [Mocking Best Practices](https://ltscommerce.dev/articles/mocking-best-practices)

"Mocking is like hot sauce — a little goes a long way."

### Rules (if tests are added)

- Mock external dependencies only: network, file system, browser APIs
- Never mock the code under test
- Never mock pure functions, value objects, or internal collaborators
- If a test needs more mock setup than test logic, refactor the code

---

## ESLint Configuration (Complete)

The scaffolder agent must set up this ESLint config. Use flat config format (`eslint.config.js`).

Required packages:
```
eslint
@typescript-eslint/eslint-plugin
@typescript-eslint/parser
typescript-eslint
```

Minimum rule set:
```javascript
{
  // TypeScript strictness
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-unsafe-assignment": "error",
  "@typescript-eslint/no-unsafe-argument": "error",
  "@typescript-eslint/no-unsafe-return": "error",
  "@typescript-eslint/no-unsafe-member-access": "error",
  "@typescript-eslint/no-unsafe-call": "error",
  "@typescript-eslint/no-non-null-assertion": "error",
  "@typescript-eslint/consistent-type-assertions": ["error", {
    "assertionStyle": "never"
  }],

  // Error prevention
  "no-eval": "error",
  "no-new-func": "error",
  "no-implied-eval": "error",
  "no-console": "error",
  "no-debugger": "error",
  "no-alert": "error",
  "eqeqeq": ["error", "always"],
  "no-var": "error",
  "prefer-const": "error",

  // Code quality
  "no-nested-ternary": "error",
  "max-depth": ["error", 3],
  "no-else-return": "error"
}
```

---

## Summary Checklist (for every commit)

- [ ] `npm run build` — zero errors, zero warnings
- [ ] `npm run lint` — zero errors
- [ ] No `any`, no `as`, no `@ts-ignore`, no `!` assertions
- [ ] No empty catch blocks, no silent defaults, no error suppression
- [ ] Functions under 30 lines, max 2 levels of nesting
- [ ] Guard clauses first, happy path at base indentation
- [ ] No hardcoded special cases, no overfitted fixes
- [ ] Services are pure, components are UI-only
- [ ] No code that isn't in the plan (YAGNI)
