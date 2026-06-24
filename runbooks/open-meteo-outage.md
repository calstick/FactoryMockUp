# Runbook: Open-Meteo API outage

The app depends entirely on the public [Open-Meteo](https://open-meteo.com) APIs
for geocoding and forecasts. If those endpoints are slow, rate-limited, or down,
the app cannot show weather even though the page itself loads fine.

## Symptoms

- City search shows the error "Geocoding failed" or "Could not load the
  forecast."
- The status area stays on "Loading weather…" indefinitely.
- Browser devtools Network tab shows failing/pending requests to
  `geocoding-api.open-meteo.com` or `api.open-meteo.com`.

## Severity

Medium — the page loads, but its core function is unavailable. No data loss
(the app stores nothing).

## Diagnose

1. Confirm the endpoints directly (replace the query as needed):

   ```bash
   curl -sS -o /dev/null -w "%{http_code} %{time_total}s\n" \
     "https://geocoding-api.open-meteo.com/v1/search?name=London&count=1"

   curl -sS -o /dev/null -w "%{http_code} %{time_total}s\n" \
     "https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=-0.12&current=temperature_2m"
   ```

   - `200` with a fast time → upstream is healthy; suspect client/network/CORS.
   - `429` → rate limited.
   - `5xx` or timeout → upstream outage.

2. Check the Open-Meteo status page / their announcements for a known outage.
3. In the browser console, look for the structured logs emitted by
   `src/weather.js` (`geocode request failed`, `forecast request failed`) — they
   include the HTTP `status` (coordinates are redacted).

## Mitigate / Resolve

- **If upstream is down (5xx/timeout):** there is no failover provider
  configured. Wait for Open-Meteo to recover. Communicate the dependency outage
  if users report it.
- **If rate limited (429):** the app makes one geocode + one forecast request
  per search, so sustained 429s usually mean a broader Open-Meteo limit, not our
  usage. Back off and retry later.
- **If only some clients fail:** suspect the user's network, an ad/script
  blocker, or a corporate proxy blocking the Open-Meteo domains.

## Verify

- Re-run the `curl` checks above and confirm `200`.
- Reload the app and perform a city search; current conditions and the 6-day
  forecast should render.

## Escalation / follow-up

- Open a GitHub issue tagged `bug` if user impact is ongoing.
- Prevention ideas (future work): add a retry/backoff around `fetchForecast`,
  show a clearer "weather service unavailable" message, or evaluate a fallback
  provider.
