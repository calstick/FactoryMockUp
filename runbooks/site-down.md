# Runbook: Site is down

The app is a static page (`index.html` + `src/`). "Down" means the hosted page
fails to load — distinct from an [Open-Meteo outage](./open-meteo-outage.md)
where the page loads but weather data fails.

## Symptoms

- The hosted URL returns 4xx/5xx, or a blank/broken page.
- `index.html` loads but the module import of `./src/weather.js` or
  `./src/logger.js` fails (console shows a 404 or MIME/type error).

## Severity

High — the app is unreachable.

## Diagnose

1. Fetch the page and the modules directly:

   ```bash
   curl -sS -o /dev/null -w "page %{http_code}\n" "<HOSTED_URL>/index.html"
   curl -sS -o /dev/null -w "weather %{http_code}\n" "<HOSTED_URL>/src/weather.js"
   curl -sS -o /dev/null -w "logger %{http_code}\n" "<HOSTED_URL>/src/logger.js"
   ```

2. Check the browser console for:
   - `Failed to load module script` → the server is sending the wrong
     `Content-Type` for `.js` (must be `text/javascript`).
   - 404 on `src/*.js` → the `src/` directory was not deployed alongside
     `index.html`.

3. Confirm what is actually deployed matches the repo layout (the page imports
   `./src/weather.js`, which imports `./src/logger.js`).

## Mitigate / Resolve

- **404 on modules:** redeploy the full directory, not just `index.html`. The
  `src/` folder must ship with the page.
- **MIME type errors:** configure the static host to serve `.js` as
  `text/javascript` (most hosts do by default; some need a config entry).
- **Bad deploy:** roll back to the previous known-good commit on `main` and
  redeploy. The app has no build step, so the deployed artifact is just the repo
  files at a given commit.

## Verify

- `curl` returns `200` for the page and both module files.
- Loading the URL renders the UI and a city search works end to end.

## Escalation / follow-up

- Open a GitHub issue tagged `bug`.
- Prevention: validate locally with `npm run dev` before deploying, and keep the
  deploy artifact in sync with the repo (whole directory, not a single file).
