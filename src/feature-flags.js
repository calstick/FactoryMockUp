// Lightweight feature flag system for the "Weather & What to Wear" app.
// Lets changes ship behind toggles for safe, incremental rollout instead of
// affecting every user the moment they merge. The resolution core is DOM-free
// so it can be unit-tested in Node; `flagsFromBrowser` adapts it to the page.

import { logger } from "./logger.js";

const log = logger.child({ component: "feature-flags" });

/**
 * @typedef {Object} FlagDefinition
 * @property {boolean} default Value used when no override is present.
 * @property {string} description Human-readable purpose of the flag.
 */

/**
 * The flag registry: the single source of truth for which toggles exist, what
 * they do, and their default (production) value. Add new in-progress features
 * here with `default: false` and flip them on once they are ready.
 * @type {Record<string, FlagDefinition>}
 */
export const FLAGS = {
  fahrenheitToggle: {
    default: true,
    description: "Show the \u00B0C/\u00B0F temperature unit switcher."
  },
  outfitTips: {
    default: true,
    description: "Show the what-to-wear recommendation card."
  },
  extendedForecast: {
    default: true,
    description: "Render the multi-day forecast strip."
  }
};

/** Prefix used for per-flag overrides in the URL query string and storage. */
export const OVERRIDE_PREFIX = "ff_";

const TRUTHY = new Set(["1", "true", "on", "yes", "enabled"]);
const FALSY = new Set(["0", "false", "off", "no", "disabled"]);

/**
 * Parse a raw override token into a boolean.
 * @param {string | null | undefined} raw
 * @returns {boolean | null} `null` when the token is absent or unrecognized.
 */
export function parseOverride(raw) {
  if (raw === null || raw === undefined) return null;
  const v = String(raw).trim().toLowerCase();
  if (TRUTHY.has(v)) return true;
  if (FALSY.has(v)) return false;
  return null;
}

/**
 * Read a key from a Storage-like object, tolerating environments where access
 * throws (e.g. disabled cookies / private mode).
 * @param {Pick<Storage, "getItem">} storage
 * @param {string} name
 * @returns {string | null}
 */
function safeGet(storage, name) {
  try {
    return storage.getItem(name);
  } catch {
    return null;
  }
}

/**
 * @typedef {Object} FlagSources
 * @property {URLSearchParams} [query] URL query params, e.g. `?ff_outfitTips=off`.
 * @property {Pick<Storage, "getItem">} [storage] Persisted overrides (localStorage).
 */

/**
 * Resolve the effective boolean value of a single flag.
 * Priority: query override > storage override > registered default.
 * @param {string} key
 * @param {FlagSources} [sources]
 * @returns {boolean}
 */
export function resolveFlag(key, sources = {}) {
  const def = FLAGS[key];
  if (!def) throw new Error(`Unknown feature flag: ${key}`);

  const overrideName = OVERRIDE_PREFIX + key;
  const fromQuery = sources.query ? parseOverride(sources.query.get(overrideName)) : null;
  if (fromQuery !== null) return fromQuery;

  const fromStorage = sources.storage
    ? parseOverride(safeGet(sources.storage, overrideName))
    : null;
  if (fromStorage !== null) return fromStorage;

  return def.default;
}

/**
 * @typedef {Object} Flags
 * @property {(key: string) => boolean} isEnabled True when the flag resolves on.
 * @property {() => Record<string, boolean>} all Snapshot of every flag's value.
 */

/**
 * Build an immutable snapshot of all flag values from the given sources. The
 * snapshot is computed once so a flag cannot change mid-render.
 * @param {FlagSources} [sources]
 * @returns {Flags}
 */
export function createFlags(sources = {}) {
  /** @type {Record<string, boolean>} */
  const values = {};
  for (const key of Object.keys(FLAGS)) {
    values[key] = resolveFlag(key, sources);
  }
  log.info("feature flags resolved", { values });

  return {
    isEnabled(key) {
      if (!(key in values)) throw new Error(`Unknown feature flag: ${key}`);
      return values[key];
    },
    all() {
      return { ...values };
    }
  };
}

/**
 * Resolve flags from the current browser environment (URL query + localStorage),
 * degrading gracefully where those globals are unavailable.
 * @returns {Flags}
 */
export function flagsFromBrowser() {
  const query =
    typeof window !== "undefined" && window.location
      ? new URLSearchParams(window.location.search)
      : undefined;
  const storage = typeof localStorage !== "undefined" ? localStorage : undefined;
  return createFlags({ query, storage });
}
