---
name: quality-gate
description: Run the full quality suite (lint, format, types, dead code, duplication, AGENTS.md validation, tests) for the Weather & What to Wear repo, then triage and fix any failures. Use before opening a PR or when CI's `quality`/`test` checks are red.
---

# Quality Gate

Run and, if needed, fix the repository's complete quality suite so a change is
ready to merge. This mirrors exactly what CI enforces on every PR and on `main`
(the `test` and `quality` workflows are required status checks).

## Prerequisites

- **Node.js 20+** must be available on `PATH`.
- Run from the repository root.

## Steps

1. Install dependencies if `node_modules` is missing or stale:

   ```bash
   npm ci
   ```

2. Run the full gate:

   ```bash
   npm run check
   ```

   This runs, in order: `lint` (ESLint) → `format:check` (Prettier) →
   `typecheck` (tsc checkJs/strict) → `deadcode` (knip) → `dupcheck` (jscpd) →
   `validate:agents` (AGENTS.md consistency) → `test` (Vitest, 80% coverage
   enforced).

3. If the gate fails, fix the **specific** failing step and re-run `npm run check`.
   Do not disable rules or add skip markers to make it pass. Map failures to fixes:

   | Failing step          | Fix                                                                     |
   | --------------------- | ----------------------------------------------------------------------- |
   | Lint (ESLint)         | `npm run lint:fix`, then resolve remaining errors by hand.              |
   | Formatting (Prettier) | `npm run format`.                                                       |
   | Type-check (tsc)      | Fix the JSDoc/type errors reported by `npm run typecheck`.              |
   | Dead code (knip)      | Remove unused files/exports/deps, or update `knip.json` if intentional. |
   | Duplication (jscpd)   | Refactor the duplicated block flagged by `npm run dupcheck`.            |
   | validate:agents       | Update `AGENTS.md` so its scripts/links/paths match reality.            |
   | Tests (vitest)        | Fix the failing assertion or the code under test; keep coverage >= 80%. |

4. When `npm run check` exits 0, the change is ready. If you added or changed
   behavior in `src/`, ensure there are matching tests under `tests/unit` or
   `tests/integration`.

## Notes

- Source logic lives in `src/weather.js` (pure, JSDoc-typed) and
  `src/logger.js` (structured logging with PII scrubbing); the DOM/UI lives in
  `index.html`.
- Tests live in `tests/unit` and `tests/integration` and run in isolated worker
  threads with `retry: 2` for flakiness tolerance.
- For incident response (not pre-merge checks), see the playbooks in
  `runbooks/`.
