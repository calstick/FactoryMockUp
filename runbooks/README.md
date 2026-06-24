# Runbooks

Incident-response playbooks for the **Weather & What to Wear** app. Each runbook
covers a likely failure mode with concrete detection, diagnosis, and recovery
steps.

Because the app is a static, client-side page that calls the keyless Open-Meteo
API directly, most "incidents" are either an upstream API problem, a hosting/CDN
problem, or a CI/quality-gate failure. The runbooks below are scoped to what can
actually go wrong here.

| Runbook                                            | When to use it                                        |
| -------------------------------------------------- | ----------------------------------------------------- |
| [Open-Meteo API outage](./open-meteo-outage.md)    | Weather/geocoding requests fail or hang for users.    |
| [Site is down](./site-down.md)                     | The hosted page returns 4xx/5xx or a blank screen.    |
| [CI / quality gate failure](./ci-failure.md)       | `test` or `quality` checks fail on a PR or on `main`. |
| [Geolocation not working](./geolocation-broken.md) | "Use my location" fails or is blocked for users.      |

## Conventions

Each runbook follows the same structure:

1. **Symptoms** — how the incident shows up.
2. **Severity** — rough impact level.
3. **Diagnose** — commands/checks to confirm the cause.
4. **Mitigate / Resolve** — concrete recovery steps.
5. **Verify** — how to confirm recovery.
6. **Escalation / follow-up** — who/what to involve and prevention.

There is no on-call rotation or paging system for this project. "Escalation"
here means opening a GitHub issue and pinging the repository owner.
