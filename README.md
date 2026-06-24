# Weather & What to Wear

A single-page web app that shows the current weather and a multi-day forecast
for any city, with a strong focus on the **"feels like" temperature** and
practical **what-to-wear** advice. It runs entirely in the browser using the
free, keyless [Open-Meteo](https://open-meteo.com) API — there is no backend,
build step, or dependency to install.

## Features

- Search weather by city name or use your current location (geolocation).
- Current conditions: temperature, "feels like", humidity, and wind.
- 6-day forecast with high/low and "feels like" per day.
- Outfit recommendations driven by the feels-like temperature, then adjusted
  for rain, snow, storms, and wind.
- Toggle between Celsius and Fahrenheit without re-fetching data.

## Requirements

- A modern web browser.
- An internet connection (the app calls the public Open-Meteo API at runtime).
- No API key, account, package manager, or build tooling is required.

## Setup & Running Locally

This is a static site contained in a single file (`index.html`). Clone the
repository and serve the directory with any static file server.

```bash
git clone https://github.com/calstick/FactoryMockUp.git
cd FactoryMockUp
```

Then start a local server using whichever option is convenient:

```bash
# Option A: Python 3 (built in on most systems)
python -m http.server 8000

# Option B: Node.js
npx serve .
```

Open the printed URL (for example http://localhost:8000) in your browser.

> Tip: Geolocation ("Use my location") requires a secure context. It works on
> `localhost` and over HTTPS, but may be blocked when opening the file directly
> via `file://`. Use one of the local servers above for full functionality.

You can also simply open `index.html` directly in a browser; city search will
work, but browser geolocation may be restricted.

## Usage

1. The app attempts to load weather for your current location on startup, and
   falls back to **London** if location access is unavailable.
2. Type a city (e.g. `Tokyo`) into the search box and press **Search**.
3. Click **Use my location** to fetch weather for your current position.
4. Use the **°C / °F** toggle to switch temperature units.

## Project Structure

```
.
├── index.html              # Markup, styles, DOM rendering, and event wiring
├── src/
│   └── weather.js          # Pure weather/forecast logic (imported by the page and tests)
├── tests/
│   ├── unit/               # Unit tests for the pure logic
│   └── integration/        # Integration tests for the API layer (mocked fetch)
├── vitest.config.js        # Test runner config (coverage, isolation, retries)
├── package.json
└── README.md
```

The page (`index.html`) handles the DOM and events and imports its logic from
`src/weather.js`. Key parts of `src/weather.js`:

- `WEATHER` — maps Open-Meteo weather codes to labels and icons.
- `geocode()` / `fetchForecast()` — call the Open-Meteo geocoding and forecast
  endpoints (a `fetch` implementation can be injected for testing).
- `clothingAdvice()` — derives the what-to-wear headline and tips.
- `describe()`, `tempStr()`, `feelsNote()`, `dayName()`, `escapeHtml()` — pure
  helpers used by `render()` in `index.html`.

## Development & Testing

The app ships as a static page, but the logic is covered by an automated test
suite ([Vitest](https://vitest.dev)). Requires Node.js 20+.

```bash
npm install            # install dev dependencies
npm test               # run the full unit + integration suite once
npm run test:watch     # re-run tests on change
npm run test:coverage  # run with a coverage report (min 80% enforced)
```

Test conventions:

- Test files live under `tests/` and are named `*.test.js`.
- Tests run in isolated worker threads in parallel; failing tests are retried
  to surface flakiness.
- Coverage thresholds (80% lines/branches/functions/statements) are enforced and
  CI uploads the coverage report as an artifact.

## Code Quality

Quality tooling is configured and enforced in CI (see
`.github/workflows/quality.yml`). A Husky pre-commit hook runs `lint-staged`
to lint and format staged files automatically.

```bash
npm run lint          # ESLint (style, complexity, file size, dead code, TODO/FIXME)
npm run lint:fix      # auto-fix lint issues
npm run format        # format all files with Prettier
npm run format:check  # verify formatting (used in CI)
npm run typecheck     # type-check the JS via TypeScript checkJs + JSDoc
npm run deadcode      # knip: unused files, exports, and dependencies
npm run dupcheck      # jscpd: copy/paste duplication
npm run check         # run every gate above plus the test suite
```

Conventions enforced:

- **Naming:** `camelCase` for variables and functions (ESLint `camelcase`); API
  response keys are accessed as properties and are intentionally exempt.
- **Complexity:** functions are capped at a cyclomatic complexity of 15.
- **File size:** modules warn above 400 lines, functions above 100.
- **Types:** `src/weather.js` is annotated with JSDoc and type-checked under
  TypeScript `strict` mode.

## Runbooks

Incident-response playbooks live in [`runbooks/`](./runbooks/README.md). They
cover the app's realistic failure modes — Open-Meteo API outages, the hosted
site being down, CI/quality-gate failures, and broken geolocation — with
concrete diagnose/mitigate/verify steps.

## External Services

| Service                                                                  | Purpose                               | Auth           |
| ------------------------------------------------------------------------ | ------------------------------------- | -------------- |
| [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api) | Resolve a city name to coordinates    | None (keyless) |
| [Open-Meteo Forecast API](https://open-meteo.com/en/docs)                | Current conditions and daily forecast | None (keyless) |

## License

No license has been specified for this project.
