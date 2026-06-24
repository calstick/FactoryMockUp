# Runbook: Geolocation not working

The "Use my location" button uses the browser's `navigator.geolocation` API to
center the forecast on the user's position. This commonly fails for reasons
outside the app's control (browser permissions, insecure context). The app is
designed to degrade gracefully, but users may still report it.

## Symptoms

- Clicking **Use my location** does nothing, or shows a location/permission
  error.
- The app silently falls back to **London** instead of the user's position.
- City search still works — only location detection is affected.

## Severity

Low — a convenience feature; city search remains fully functional and the app
falls back to a default city.

## Diagnose

1. Confirm the **serving context**. The Geolocation API only works in a secure
   context: `https://` or `http://localhost`. Opening the page via `file://` or
   plain `http://` on a remote host disables it.
2. Check the **browser permission** for location (site settings). A denied
   permission blocks the prompt entirely.
3. Check the browser console for the app's structured logs from the `ui` child
   logger (geolocation error / timeout). The app uses a **~6s timeout** and then
   falls back to the default city.
4. Confirm `navigator.geolocation` exists in the target browser/environment
   (very old or stripped environments may lack it).

## Mitigate / Resolve

- **Insecure context:** serve the app over HTTPS or `localhost`
  (`npm run dev`). This is the most common cause.
- **Permission denied:** instruct the user to re-enable location for the site in
  their browser settings, then retry. The app cannot override a user denial.
- **Unsupported / times out:** this is expected to fall back to the default
  city. Confirm the fallback renders weather so the app is still usable.

## Verify

- Over HTTPS/localhost with permission granted, clicking **Use my location**
  prompts (if needed) and loads weather for the detected position.
- With permission denied or unsupported, the app cleanly falls back to London
  and city search continues to work.

## Escalation / follow-up

- Open a GitHub issue tagged `bug` only if geolocation fails in a **secure
  context with permission granted** (that would indicate an app bug, not an
  environment limitation).
- Prevention: keep the timeout/fallback path covered and ensure production is
  always served over HTTPS.
