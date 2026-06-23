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

| Script                     | Command                                                                                                         | Purpose                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `npm run dev`              | `npx --yes serve .`                                                                                             | Serve the static site locally.                   |
| `npm test`                 | `vitest run`                                                                                                    | Run the full test suite once.                    |
| `npm run test:watch`       | `vitest`                                                                                                        | Re-run tests on file change.                     |
| `npm run test:unit`        | `vitest run tests/unit`                                                                                         | Run unit tests only.                             |
| `npm run test:integration` | `vitest run tests/integration`                                                                                  | Run integration tests only.                      |
| `npm run test:coverage`    | `vitest run --coverage`                                                                                         | Run tests with a coverage report.                |
| `npm run test:list`        | `vitest list`                                                                                                   | List the discovered test cases.                  |
| `npm run lint`             | `eslint .`                                                                                                      | Lint all files with ESLint.                      |
| `npm run lint:fix`         | `eslint . --fix`                                                                                                | Auto-fix lint issues.                            |
| `npm run format`           | `prettier --write .`                                                                                            | Format all files with Prettier.                  |
| `npm run format:check`     | `prettier --check .`                                                                                            | Verify formatting (no writes).                   |
| `npm run typecheck`        | `tsc --noEmit`                                                                                                  | Type-check JS via TypeScript checkJs.            |
| `npm run deadcode`         | `knip`                                                                                                          | Detect unused files, exports, and dependencies.  |
| `npm run dupcheck`         | `jscpd src tests`                                                                                               | Detect copy/paste duplication.                   |
| `npm run check`            | `npm run lint && npm run format:check && npm run typecheck && npm run deadcode && npm run dupcheck && npm test` | Run every quality gate plus the test suite.      |
| `npm run prepare`          | `husky`                                                                                                         | Install Husky git hooks (runs on `npm install`). |

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
  `typecheck`, `deadcode`, and `dupcheck`.

Both checks (`test` and `quality`) are **required status checks on the protected
`main` branch** (PRs required; no force-push or branch deletion).

## External Services

The app calls the **Open-Meteo** APIs directly from the browser:

| Service                  | Purpose                               | Auth           |
| ------------------------ | ------------------------------------- | -------------- |
| Open-Meteo Geocoding API | Resolve a city name to coordinates    | None (keyless) |
| Open-Meteo Forecast API  | Current conditions and daily forecast | None (keyless) |

No API keys, environment variables, or secrets are required.
