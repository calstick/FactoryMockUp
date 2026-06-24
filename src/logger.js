// Structured, leveled logging for the "Weather & What to Wear" app.
// Emits single-line JSON records so logs are machine-parseable in the browser
// console and any log drain. Sensitive fields (precise geolocation, etc.) are
// scrubbed before output to avoid leaking quasi-PII.
//
// DOM-free so it can be unit-tested in Node and reused in the browser.

/** @typedef {"debug" | "info" | "warn" | "error"} LogLevel */

/** @type {Record<LogLevel, number>} */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

/** Field names whose values are redacted wherever they appear in log context. */
export const SENSITIVE_KEYS = [
  "lat",
  "lon",
  "latitude",
  "longitude",
  "coords",
  "coordinates",
  "address",
  "ip",
  "email",
  "token",
  "apiKey",
  "api_key",
  "authorization",
  "password"
];

const REDACTED = "[REDACTED]";

/**
 * Recursively copy a value, replacing any sensitive field values with a
 * redaction marker. Cycles are guarded with a seen-set; unknown structures are
 * returned as-is. Never mutates the input.
 * @param {unknown} value
 * @param {Set<unknown>} [seen]
 * @returns {unknown}
 */
export function scrub(value, seen = new Set()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => scrub(item, seen));
  }

  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, val] of Object.entries(/** @type {Record<string, unknown>} */ (value))) {
    out[key] = SENSITIVE_KEYS.includes(key) ? REDACTED : scrub(val, seen);
  }
  return out;
}

/**
 * Reduce an Error to a serializable, scrubbed shape for logging.
 * @param {unknown} err
 * @returns {Record<string, unknown> | undefined}
 */
function serializeError(err) {
  if (err === undefined) return undefined;
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { message: String(err) };
}

/**
 * @typedef {Object} LoggerOptions
 * @property {LogLevel} [level] Minimum level to emit (default "info").
 * @property {Pick<Console, "debug" | "info" | "warn" | "error">} [sink] Output target (default console).
 * @property {() => string} [now] Timestamp provider, injectable for tests.
 */

/**
 * @typedef {Object} Logger
 * @property {(msg: string, ctx?: Record<string, unknown>) => void} debug
 * @property {(msg: string, ctx?: Record<string, unknown>) => void} info
 * @property {(msg: string, ctx?: Record<string, unknown>) => void} warn
 * @property {(msg: string, ctx?: Record<string, unknown>, err?: unknown) => void} error
 * @property {(bindings: Record<string, unknown>) => Logger} child
 */

/**
 * Create a structured logger. Records are emitted as single-line JSON via the
 * configured sink. `child` returns a logger that merges extra bindings into
 * every record (e.g. a component or request id).
 * @param {LoggerOptions} [options]
 * @param {Record<string, unknown>} [bindings]
 * @returns {Logger}
 */
export function createLogger(options = {}, bindings = {}) {
  const level = options.level || "info";
  const sink = options.sink || console;
  const now = options.now || (() => new Date().toISOString());
  const threshold = LEVELS[level];

  /**
   * @param {LogLevel} lvl
   * @param {string} msg
   * @param {Record<string, unknown>} [ctx]
   * @param {unknown} [err]
   */
  function emit(lvl, msg, ctx, err) {
    if (LEVELS[lvl] < threshold) return;
    /** @type {Record<string, unknown>} */
    const record = {
      level: lvl,
      time: now(),
      msg,
      .../** @type {Record<string, unknown>} */ (scrub({ ...bindings, ...ctx }))
    };
    const serialized = serializeError(err);
    if (serialized) record.error = scrub(serialized);
    sink[lvl](JSON.stringify(record));
  }

  return {
    debug: (msg, ctx) => emit("debug", msg, ctx),
    info: (msg, ctx) => emit("info", msg, ctx),
    warn: (msg, ctx) => emit("warn", msg, ctx),
    error: (msg, ctx, err) => emit("error", msg, ctx, err),
    child: (extra) => createLogger(options, { ...bindings, ...extra })
  };
}

/**
 * Resolve the default log level. Honors a LOG_LEVEL env var when present
 * (e.g. tests set LOG_LEVEL=silent to suppress output); otherwise "info".
 * @returns {LogLevel}
 */
function defaultLevel() {
  const env =
    typeof process !== "undefined" && process.env && process.env.LOG_LEVEL
      ? process.env.LOG_LEVEL
      : "";
  if (env === "silent") return "error";
  if (env === "debug" || env === "info" || env === "warn" || env === "error") return env;
  return "info";
}

/** Default application logger. */
export const logger = createLogger({ level: defaultLevel() });
