# Runbook: CI / quality gate failure

The repo runs two required checks on every PR and on `main`: **`test`**
(`.github/workflows/test.yml`) and **`quality`**
(`.github/workflows/quality.yml`). Both must pass to merge. This runbook covers
diagnosing and fixing a red check.

## Symptoms

- A PR shows a failing `test` or `quality` check and merging is blocked.
- A push to `main` shows a red workflow run.

## Severity

Low–Medium — no user impact, but it blocks merges until resolved.

## Diagnose

1. List recent runs and open the failing one's logs:

   ```bash
   gh run list --limit 10
   gh run view <run-id> --log-failed
   ```

2. Reproduce locally (Node.js 20+ required):

   ```bash
   npm ci
   npm run check     # lint + format:check + typecheck + deadcode + dupcheck + test
   ```

   `npm run check` runs the same gates as CI, so a local failure mirrors CI.

## Mitigate / Resolve

Match the fix to the failing gate:

| Failing step          | Fix                                                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint (ESLint)         | `npm run lint:fix`, then resolve any remaining errors by hand.                                                                                  |
| Formatting (Prettier) | `npm run format`.                                                                                                                               |
| Type-check (tsc)      | Fix the JSDoc types / type errors reported by `npm run typecheck`.                                                                              |
| Dead code (knip)      | Remove unused files/exports/deps, or update `knip.json`.                                                                                        |
| Duplication (jscpd)   | Refactor the duplicated block flagged by `npm run dupcheck`.                                                                                    |
| Tests (vitest)        | Fix the failing assertion or the code under test; re-run `npm test`.                                                                            |
| `npm ci` ERESOLVE     | A peer-dependency conflict (e.g. mismatched eslint/@eslint/js majors). Align the versions in `package.json` and regenerate `package-lock.json`. |

A common real example: a Dependabot PR bumping `@eslint/js` to a new major
without bumping `eslint` causes `npm ci` to fail with `ERESOLVE`. Bump both in
lockstep so their majors match.

## Verify

- `npm run check` passes locally with exit code 0.
- Push and confirm both `test` and `quality` checks go green on the PR.

## Escalation / follow-up

- If a check is flaky (passes on re-run), note it; the test suite already uses
  `retry: 2` to absorb transient flakiness.
- Persistent infra failures (runner/network) → re-run via `gh run rerun <id>`.
