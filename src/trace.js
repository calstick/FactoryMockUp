// Lightweight distributed tracing for the app's outbound API calls.
//
// A single W3C-style trace id represents one page session; every outbound
// request gets a fresh span id. The ids are propagated to Open-Meteo via the
// standard `traceparent` header and a human-friendly `X-Request-Id`, and the
// request's duration/outcome is logged against them. That lets a single user
// action be followed across our logs and (where supported) the upstream
// service. DOM-free so it can be unit-tested in Node and reused in the browser.

import { logger } from "./logger.js";

const log = logger.child({ component: "trace" });

/**
 * Generate a random lowercase-hex string of `bytes` bytes (2 chars per byte).
 * Prefers `crypto.getRandomValues`, falling back to `Math.random` where the
 * Web Crypto API is unavailable.
 * @param {number} bytes
 * @returns {string}
 */
export function randomHex(bytes) {
  const arr = new Uint8Array(bytes);
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * @typedef {Object} Span
 * @property {string} spanId 8-byte hex id for a single request.
 * @property {Record<string, string>} headers Propagation headers for the span.
 */

/**
 * @typedef {Object} TraceContext
 * @property {string} traceId 16-byte hex id, stable for the session.
 * @property {() => Span} startSpan Mint a new span (id + propagation headers).
 */

/**
 * Create a trace context for the current session.
 * @param {string} [traceId] Override the generated trace id (useful in tests).
 * @returns {TraceContext}
 */
export function createTrace(traceId = randomHex(16)) {
  return {
    traceId,
    startSpan() {
      const spanId = randomHex(8);
      return {
        spanId,
        headers: {
          traceparent: `00-${traceId}-${spanId}-01`,
          "X-Request-Id": `${traceId}-${spanId}`
        }
      };
    }
  };
}

/**
 * Wrap a fetch implementation so every request carries trace headers and its
 * duration + outcome is logged against the trace and span id.
 * @param {typeof fetch} fetchImpl
 * @param {TraceContext} trace
 * @param {() => number} [now] Clock, injectable for tests.
 * @returns {typeof fetch}
 */
export function tracedFetch(fetchImpl, trace, now = () => Date.now()) {
  /** @type {typeof fetch} */
  const wrapped = async (input, init) => {
    const span = trace.startSpan();
    const start = now();
    const headers = new Headers(init?.headers);
    for (const [key, value] of Object.entries(span.headers)) headers.set(key, value);

    log.debug("request start", { traceId: trace.traceId, spanId: span.spanId });
    try {
      const res = await fetchImpl(input, { ...init, headers });
      log.info("request end", {
        traceId: trace.traceId,
        spanId: span.spanId,
        status: res.status,
        durationMs: now() - start
      });
      return res;
    } catch (err) {
      log.error(
        "request failed",
        { traceId: trace.traceId, spanId: span.spanId, durationMs: now() - start },
        err
      );
      throw err;
    }
  };
  return wrapped;
}
