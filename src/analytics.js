// Product analytics dispatch. Provider-agnostic on purpose: it forwards events
// to whichever supported tool is present on the page (PostHog, GA4/gtag, or
// Amplitude) and otherwise buffers them. That lets the app measure real feature
// usage (city search, geolocation, unit toggle) so the impact of changes is
// observable, without hard-coupling the codebase to one vendor SDK.

import { logger } from "./logger.js";

const log = logger.child({ component: "analytics" });

/**
 * @typedef {Object} AnalyticsWindow
 * @property {{ capture?: Function }} [posthog]
 * @property {Function} [gtag]
 * @property {{ track?: Function }} [amplitude]
 */

/**
 * @typedef {Object} AnalyticsEvent
 * @property {string} event
 * @property {Record<string, unknown>} props
 * @property {string} time ISO timestamp.
 */

/**
 * @typedef {Object} AnalyticsOptions
 * @property {(event: string, props: Record<string, unknown>) => void} [provider] Explicit sink (overrides detection).
 * @property {() => AnalyticsWindow | undefined} [getWindow] Window accessor, injectable for tests.
 * @property {() => string} [now] Timestamp provider, injectable for tests.
 */

/**
 * Detect a supported analytics provider on the page and return a normalized
 * `(event, props)` sink, or null when none is available.
 * @param {AnalyticsOptions} options
 * @returns {((event: string, props: Record<string, unknown>) => void) | null}
 */
function detectSink(options) {
  if (options.provider) return options.provider;
  const w = options.getWindow ? options.getWindow() : undefined;
  if (!w) return null;
  const posthog = w.posthog;
  if (posthog && typeof posthog.capture === "function") {
    const capture = posthog.capture;
    return (event, props) => capture(event, props);
  }
  if (typeof w.gtag === "function") {
    const gtag = w.gtag;
    return (event, props) => gtag("event", event, props);
  }
  const amplitude = w.amplitude;
  if (amplitude && typeof amplitude.track === "function") {
    const track = amplitude.track;
    return (event, props) => track(event, props);
  }
  return null;
}

/**
 * @typedef {Object} Analytics
 * @property {(event: string, props?: Record<string, unknown>) => AnalyticsEvent} track Send/buffer an event.
 * @property {() => AnalyticsEvent[]} pending The buffered event history.
 */

/**
 * Create an analytics dispatcher.
 * @param {AnalyticsOptions} [options]
 * @returns {Analytics}
 */
export function createAnalytics(options = {}) {
  const now = options.now || (() => new Date().toISOString());
  /** @type {AnalyticsEvent[]} */
  const buffer = [];

  return {
    track(event, props = {}) {
      const record = { event, props, time: now() };
      buffer.push(record);
      const sink = detectSink(options);
      if (sink) {
        sink(event, props);
      } else {
        log.debug("analytics event buffered (no provider)", { event });
      }
      return record;
    },
    pending() {
      return [...buffer];
    }
  };
}
