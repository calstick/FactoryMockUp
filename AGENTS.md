# AGENTS.md

Essentials for autonomous agents working in this repository.

## Project Overview

**Weather & What to Wear** is a single-page weather app with a "feels like"
emphasis and what-to-wear outfit advice. It is a **static, client-side app with
no backend** — `index.html` runs entirely in the browser and calls the keyless
Open-Meteo API directly at runtime. There is no server, database, or build step.

## Prerequisites

- **Node.js 20+** (used by CI and the tooling/test suite).
- **npm** (for installing dev dependencies and running scripts).

The app itself needs no Node to run — only the dev tooling/tests do.

## Setup & Running

```bash
npm install     # install dev dependencies
npm run dev     # serve the current directory via `npx serve .`
```

Open the printed local URL in a browser. (Geolocation requires a secure context
such as `localhost` or HTTPS.)

## Script Reference

Scripts are copied verbatim from `package.json`:

| Script                     | Command                                                                                                                                                         | Purpose                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `npm run dev`              | `npx --yes serve .`                                                                                                                                             | Serve the static site locally.                    |
| `npm run build`            | `node scripts/build.mjs`                                                                                                                                        | Build `dist/` (minify JS) and emit build metrics. |
| `npm test`                 | `vitest run`                                                                                                                                                    | Run the full test suite once.                     |
| `npm run test:watch`       | `vitest`                                                                                                                                                        | Re-run tests on file change.                      |
| `npm run test:unit`        | `vitest run tests/unit`                                                                                                                                         | Run unit tests only.                              |
| `npm run test:integration` | `vitest run tests/integration`                                                                                                                                  | Run integration tests only.                       |
| `npm run test:coverage`    | `vitest run --coverage`                                                                                                                                         | Run tests with a coverage report.                 |
| `npm run test:list`        | `vitest list`                                                                                                                                                   | List the discovered test cases.                   |
| `npm run lint`             | `eslint .`                                                                                                                                                      | Lint all files with ESLint.                       |
| `npm run lint:fix`         | `eslint . --fix`                                                                                                                                                | Auto-fix lint issues.                             |
| `npm run format`           | `prettier --write .`                                                                                                                                            | Format all files with Prettier.                   |
| `npm run format:check`     | `prettier --check .`                                                                                                                                            | Verify formatting (no writes).                    |
| `npm run typecheck`        | `tsc --noEmit`                                                                                                                                                  | Type-check JS via TypeScript checkJs.             |
| `npm run deadcode`         | `knip`                                                                                                                                                          | Detect unused files, exports, and dependencies.   |
| `npm run dupcheck`         | `jscpd src tests`                                                                                                                                               | Detect copy/paste duplication.                    |
| `npm run deadflags`        | `node scripts/check-dead-flags.mjs`                                                                                                                             | Detect dead feature flags (registry vs usage).    |
| `npm run validate:agents`  | `node scripts/validate-agents-md.mjs`                                                                                                                           | Verify AGENTS.md scripts/links/paths stay valid.  |
| `npm run check`            | `npm run lint && npm run format:check && npm run typecheck && npm run deadcode && npm run dupcheck && npm run deadflags && npm run validate:agents && npm test` | Run every quality gate plus the test suite.       |
| `npm run prepare`          | `husky`                                                                                                                                                         | Install Husky git hooks (runs on `npm install`).  |

## Testing

- Test runner: **Vitest** (config in `vitest.config.js`).
- Tests live in **`tests/unit`** and **`tests/integration`**; files match
  `tests/**/*.{test,spec}.js`.
- **Coverage thresholds are enforced at 80%** for lines, functions, branches,
  and statements — the suite fails below these.
- `npm test` runs the suite; `npm run check` runs all quality gates plus tests.

## Project Structure

```
.
├── index.html        # DOM/UI markup, styles, rendering, and event logic; loads the ES module
├── src/
│   └── weather.js    # Pure logic (JSDoc-typed, named exports), no DOM access
└── tests/
    ├── unit/         # Unit tests for the pure logic
    └── integration/  # Integration tests for the API layer (mocked fetch)
```

`index.html` imports named exports (`describe`, `tempStr`, `clothingAdvice`,
`feelsNote`, `escapeHtml`, `dayName`, `geocode`, `fetchForecast`) from
`src/weather.js`.

## Conventions

- **ESLint** flat config (`eslint.config.js`): enforces `camelcase`,
  `complexity` (max 15), `max-lines` / `max-lines-per-function`,
  `no-unused-vars`, `eqeqeq`, and warns on `no-warning-comments`
  (todo/fixme/hack/xxx).
- **Prettier** for formatting (`format` / `format:check`).
- **TypeScript** type-checking via `tsconfig.json` (`allowJs` + `checkJs` +
  `strict`); `src/weather.js` is JSDoc-annotated.
- **knip** for dead code / unused dependencies; **jscpd** for duplication.

## Pre-commit

A **Husky** hook (`.husky/pre-commit`) runs **lint-staged**, which applies
`eslint --fix` and `prettier --write` to staged JS files (Prettier only for
JSON/CSS/MD/HTML/YML/YAML).

## Continuous Integration

GitHub Actions runs two workflows:

- **`test`** (`.github/workflows/test.yml`) — installs deps and runs
  `npm run test:coverage`, uploading the coverage report as an artifact.
- **`quality`** (`.github/workflows/quality.yml`) — runs `lint`, `format:check`,
  `typecheck`, `deadcode`, `dupcheck`, `deadflags`, and `validate:agents` (which
  checks this file's documented scripts, links, and paths still resolve).
- **`CodeQL`** (`.github/workflows/codeql.yml`) — runs GitHub's CodeQL SAST
  (`security-and-quality` queries) on pushes, PRs, and a weekly schedule,
  surfacing findings in the repo's code-scanning alerts.

Both checks (`test` and `quality`) are **required status checks on the protected
`main` branch** (PRs required; no force-push or branch deletion).

## Repository Governance

- **Code owners:** `.github/CODEOWNERS` requests the maintainer's review on
  matching changes, backing the protected-branch review requirement.
- **Templates:** `.github/pull_request_template.md` and the issue forms behind
  `.github/ISSUE_TEMPLATE/config.yml` (bug report / feature request) standardize
  what contributors provide.
- **Labels:** the taxonomy in `.github/labels.yml` (priority / type / area) is
  applied to issues (issue templates pre-apply `type:*`) and kept in sync by
  `.github/workflows/labels.yml`.
- **Automated PR review:** `.github/workflows/pr-review.yml` posts an AI
  code-review comment on each pull request via `droid exec` when
  `FACTORY_API_KEY` is set.

## Build & Release

- **Build:** `npm run build` runs `scripts/build.mjs`, which assembles a
  deployable `dist/` tree and minifies `src/*.js` with **esbuild**. The script
  records per-stage durations and the minification byte savings to a
  build-metrics JSON file under `dist/` and appends a summary table to the
  GitHub Actions job summary, so **build performance is tracked on every
  deploy**.
- **Deploy (CD):** `.github/workflows/deploy.yml` runs on every push to `main`.
  It builds the site (restoring a keyed `dist` cache for unchanged sources) and
  publishes it to **GitHub Pages** via `upload-pages-artifact` / `deploy-pages`,
  giving automated, frequent deployments on merge.
- **Release notes / changelog:** `.github/workflows/release-please.yml` uses
  **release-please** (config in `release-please-config.json`, version state in
  `.release-please-manifest.json`) to maintain a release PR from Conventional
  Commit messages. Merging it bumps the version, updates `CHANGELOG.md`, and
  publishes a GitHub Release with generated notes.

## Logging & Observability

Structured logging lives in `src/logger.js` (`createLogger` + a default
`logger`). Records are emitted as single-line JSON (`level`, `time`, `msg`, plus
context) via the console sink, so they are machine-parseable in the browser and
any log drain.

- Use `logger.child({ component: "..." })` to tag a subsystem (e.g. `weather`,
  `ui`).
- **Log scrubbing:** sensitive fields are redacted before output. Keys in
  `SENSITIVE_KEYS` (precise geolocation `lat`/`lon`/`latitude`/`longitude`,
  `coords`, `address`, `ip`, `email`, tokens, passwords, etc.) are replaced with
  `[REDACTED]` recursively. When logging coordinates, pass them as context keys
  (e.g. `log.info("...", { lat, lon })`) so they are scrubbed automatically;
  never interpolate raw secrets/PII into the `msg` string.
- **Level control:** the default level is `info`; set `LOG_LEVEL`
  (`debug|info|warn|error|silent`) to adjust. Tests run with `LOG_LEVEL=silent`
  and inject their own sink when asserting on log output.

### Tracing, metrics, errors & analytics

The browser app is instrumented with small, DOM-free modules (all unit-tested
and wired up in `index.html`):

- **Distributed tracing** (`src/trace.js`): one W3C trace id per page session;
  `tracedFetch` stamps every Open-Meteo request with `traceparent` and
  `X-Request-Id` headers and logs its duration/outcome against the trace + span
  id, so a user action can be followed end-to-end.
- **Metrics** (`src/metrics.js`): counters + timers (`createMetrics`) for API
  latency, error counts, and feature usage. Snapshots flush as a `metric` log
  event and, when `APP_CONFIG.metricsEndpoint` is set, beacon to a collector.
- **Error tracking** (`src/error-tracking.js`): a breadcrumb trail + user/trace
  context that forwards to **Sentry** when its DSN is configured
  (`APP_CONFIG.sentryDsn`). The build emits external source maps so minified
  frames de-minify in Sentry.
- **Product analytics** (`src/analytics.js`): provider-agnostic `track()` that
  dispatches to **PostHog** / GA4 / Amplitude when present
  (`APP_CONFIG.posthogKey`), instrumenting search, geolocation, and unit
  toggles.

Configure these via the `window.APP_CONFIG` block at the top of `index.html`
(or inject it at deploy time). With no keys set, everything degrades to
structured console logging and no external calls are made.

### Alerting & error-to-insight

`.github/workflows/alert-on-failure.yml` runs when **Tests**, **Code Quality**,
or **Deploy** fail on `main`. It pages on-call via the **PagerDuty** Events API
(when `PAGERDUTY_ROUTING_KEY` is set) and opens/updates a tracking GitHub issue
so failures become actionable work items.

### Deployment observability — where to watch impact

Each deploy run (`.github/workflows/deploy.yml`) appends dashboard pointers to
its job summary and can post to a deploy channel (`DEPLOY_WEBHOOK_URL`). Consult:

- **Errors:** the Sentry issues dashboard (org-configured;
  `vars.SENTRY_DASHBOARD_URL`).
- **Usage:** the PostHog project dashboard (`vars.POSTHOG_DASHBOARD_URL`).
- **Deploys/build timing:** the repo **Deployments** tab and the Deploy run's
  build-performance summary.

## Runbooks

Incident-response playbooks live in [`runbooks/`](./runbooks/README.md):
[Open-Meteo outage](./runbooks/open-meteo-outage.md),
[site down](./runbooks/site-down.md),
[CI/quality failure](./runbooks/ci-failure.md), and
[geolocation broken](./runbooks/geolocation-broken.md). Consult them when
diagnosing or responding to an incident.

## External Services

The app calls the **Open-Meteo** APIs directly from the browser:

| Service                  | Purpose                               | Auth           |
| ------------------------ | ------------------------------------- | -------------- |
| Open-Meteo Geocoding API | Resolve a city name to coordinates    | None (keyless) |
| Open-Meteo Forecast API  | Current conditions and daily forecast | None (keyless) |

No API keys, environment variables, or secrets are required.
