// Contextualized error tracking. Maintains a rolling breadcrumb trail and a
// user/session context object, then enriches every captured error with both
// before forwarding it to Sentry (when the browser SDK is present on the page)
// and to our structured logger as a fallback. Combined with the source maps
// emitted by the build, this lets a production error be traced back to the
// exact code path that produced it. DOM-free core so it is unit-testable.

import { logger } from "./logger.js";

const log = logger.child({ component: "error-tracking" });

/**
 * @typedef {Object} SentryLike
 * @property {Function} [addBreadcrumb]
 * @property {Function} [captureException]
 * @property {Function} [setUser]
 */

/**
 * @typedef {Object} Breadcrumb
 * @property {string} message
 * @property {string} category
 * @property {string} time ISO timestamp.
 */

/**
 * @typedef {Object} ErrorTrackerOptions
 * @property {number} [maxBreadcrumbs] Ring-buffer size (default 20).
 * @property {() => SentryLike | undefined} [getSentry] Sentry accessor, injectable for tests.
 * @property {() => string} [now] Timestamp provider, injectable for tests.
 */

/**
 * @typedef {Object} ErrorTracker
 * @property {(message: string, category?: string) => void} addBreadcrumb
 * @property {(extra: Record<string, unknown>) => void} setContext
 * @property {(err: unknown, extra?: Record<string, unknown>) => Record<string, unknown>} captureError
 * @property {() => Breadcrumb[]} breadcrumbs
 */

/**
 * Create an error tracker.
 * @param {ErrorTrackerOptions} [options]
 * @returns {ErrorTracker}
 */
export function createErrorTracker(options = {}) {
  const maxBreadcrumbs = options.maxBreadcrumbs ?? 20;
  const now = options.now || (() => new Date().toISOString());
  const getSentry =
    options.getSentry ||
    (() =>
      typeof window !== "undefined"
        ? /** @type {{ Sentry?: SentryLike }} */ (/** @type {unknown} */ (window)).Sentry
        : undefined);

  /** @type {Breadcrumb[]} */
  const trail = [];
  /** @type {Record<string, unknown>} */
  let context = {};

  return {
    addBreadcrumb(message, category = "app") {
      trail.push({ message, category, time: now() });
      while (trail.length > maxBreadcrumbs) trail.shift();
      const sentry = getSentry();
      if (sentry && typeof sentry.addBreadcrumb === "function") {
        sentry.addBreadcrumb({ message, category });
      }
    },
    setContext(extra) {
      context = { ...context, ...extra };
      const sentry = getSentry();
      if (sentry && typeof sentry.setUser === "function" && extra.user) {
        sentry.setUser(extra.user);
      }
    },
    captureError(err, extra = {}) {
      const payload = { ...context, ...extra, breadcrumbs: [...trail] };
      log.error("captured error", payload, err);
      const sentry = getSentry();
      if (sentry && typeof sentry.captureException === "function") {
        sentry.captureException(err, { extra: payload });
      }
      return payload;
    },
    breadcrumbs() {
      return [...trail];
    }
  };
}
