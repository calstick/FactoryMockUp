// In-app engineering telemetry: counters and timers for things like API
// latency, error rates, and feature usage. Records are summarized into a
// snapshot and flushed as a structured `metric` log event and, in the browser,
// optionally beaconed to a collector endpoint (Prometheus pushgateway, Datadog
// agent proxy, custom ingest, etc.). DOM-free core so it is unit-testable.

import { logger } from "./logger.js";

const log = logger.child({ component: "metrics" });

/**
 * @typedef {Object} TimingSummary
 * @property {number} count
 * @property {number} totalMs
 * @property {number} avgMs
 * @property {number} maxMs
 */

/**
 * @typedef {Object} MetricsSnapshot
 * @property {Record<string, number>} counters
 * @property {Record<string, TimingSummary>} timings
 */

/**
 * @typedef {Object} MetricsOptions
 * @property {() => number} [now] Clock, injectable for tests.
 * @property {string} [endpoint] Collector URL for browser beacons.
 * @property {(url: string, body: string) => boolean} [beacon] Beacon transport (default navigator.sendBeacon).
 */

/**
 * Resolve the default flush transport: a browser beacon to `endpoint` when one
 * is configured and the platform supports it. Returns null otherwise.
 * @param {MetricsOptions} options
 * @returns {((snapshot: MetricsSnapshot) => void) | null}
 */
function defaultTransport(options) {
  if (!options.endpoint) return null;
  const beacon =
    options.beacon ||
    (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function"
      ? (url, body) => navigator.sendBeacon(url, body)
      : null);
  if (!beacon) return null;
  const endpoint = options.endpoint;
  return (snapshot) => beacon(endpoint, JSON.stringify(snapshot));
}

/**
 * @typedef {Object} Metrics
 * @property {(name: string, value?: number) => number} increment Add to a counter.
 * @property {(name: string, ms: number) => void} record Record a timing sample (ms).
 * @property {(name: string) => () => number} time Start a timer; the returned fn stops it.
 * @property {() => MetricsSnapshot} snapshot Aggregate the current values.
 * @property {(transport?: (s: MetricsSnapshot) => void) => MetricsSnapshot} flush Emit + send the snapshot.
 */

/**
 * Create a metrics registry.
 * @param {MetricsOptions} [options]
 * @returns {Metrics}
 */
export function createMetrics(options = {}) {
  const now = options.now || (() => Date.now());
  /** @type {Record<string, number>} */
  const counters = {};
  /** @type {Record<string, number[]>} */
  const timings = {};

  /** @type {Metrics} */
  const api = {
    increment(name, value = 1) {
      counters[name] = (counters[name] || 0) + value;
      return counters[name];
    },
    record(name, ms) {
      if (!timings[name]) timings[name] = [];
      timings[name].push(ms);
    },
    time(name) {
      const start = now();
      return () => {
        const ms = now() - start;
        api.record(name, ms);
        return ms;
      };
    },
    snapshot() {
      /** @type {Record<string, TimingSummary>} */
      const t = {};
      for (const [name, samples] of Object.entries(timings)) {
        const total = samples.reduce((a, b) => a + b, 0);
        t[name] = {
          count: samples.length,
          totalMs: +total.toFixed(1),
          avgMs: +(total / samples.length).toFixed(1),
          maxMs: Math.max(...samples)
        };
      }
      return { counters: { ...counters }, timings: t };
    },
    flush(transport) {
      const data = api.snapshot();
      log.info("metrics flush", data);
      const send = transport || defaultTransport(options);
      if (send) send(data);
      return data;
    }
  };

  return api;
}
