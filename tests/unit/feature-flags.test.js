import { describe as group, it, expect, afterEach, vi } from "vitest";
import {
  FLAGS,
  OVERRIDE_PREFIX,
  parseOverride,
  resolveFlag,
  createFlags,
  flagsFromBrowser
} from "../../src/feature-flags.js";

// A Storage-shaped stub backed by a plain object.
function makeStorage(initial = {}) {
  const map = { ...initial };
  return {
    getItem: (k) => (k in map ? map[k] : null)
  };
}

group("FLAGS registry", () => {
  it("defines a boolean default and a description for every flag", () => {
    for (const [key, def] of Object.entries(FLAGS)) {
      expect(typeof def.default, `${key}.default`).toBe("boolean");
      expect(def.description.length, `${key}.description`).toBeGreaterThan(0);
    }
  });
});

group("parseOverride", () => {
  it("parses truthy tokens (case/space-insensitive)", () => {
    for (const t of ["1", "true", "on", "YES", " enabled "]) {
      expect(parseOverride(t)).toBe(true);
    }
  });

  it("parses falsy tokens", () => {
    for (const t of ["0", "false", "off", "no", "disabled"]) {
      expect(parseOverride(t)).toBe(false);
    }
  });

  it("returns null for absent or unrecognized tokens", () => {
    expect(parseOverride(null)).toBe(null);
    expect(parseOverride(undefined)).toBe(null);
    expect(parseOverride("maybe")).toBe(null);
  });
});

group("resolveFlag", () => {
  it("falls back to the registered default with no overrides", () => {
    expect(resolveFlag("outfitTips")).toBe(FLAGS.outfitTips.default);
  });

  it("prefers a query override over storage and default", () => {
    const query = new URLSearchParams(`${OVERRIDE_PREFIX}outfitTips=off`);
    const storage = makeStorage({ [`${OVERRIDE_PREFIX}outfitTips`]: "on" });
    expect(resolveFlag("outfitTips", { query, storage })).toBe(false);
  });

  it("uses a storage override when the query has none", () => {
    const query = new URLSearchParams("");
    const storage = makeStorage({ [`${OVERRIDE_PREFIX}extendedForecast`]: "off" });
    expect(resolveFlag("extendedForecast", { query, storage })).toBe(false);
  });

  it("ignores unrecognized override values and returns the default", () => {
    const query = new URLSearchParams(`${OVERRIDE_PREFIX}fahrenheitToggle=banana`);
    expect(resolveFlag("fahrenheitToggle", { query })).toBe(FLAGS.fahrenheitToggle.default);
  });

  it("tolerates storage access that throws", () => {
    const storage = {
      getItem: () => {
        throw new Error("blocked");
      }
    };
    expect(resolveFlag("outfitTips", { storage })).toBe(FLAGS.outfitTips.default);
  });

  it("throws for an unknown flag", () => {
    expect(() => resolveFlag("nope")).toThrow(/Unknown feature flag/);
  });
});

group("createFlags", () => {
  it("snapshots every registered flag", () => {
    const flags = createFlags();
    expect(Object.keys(flags.all()).sort()).toEqual(Object.keys(FLAGS).sort());
  });

  it("reports isEnabled from the resolved snapshot", () => {
    const query = new URLSearchParams(`${OVERRIDE_PREFIX}outfitTips=off`);
    const flags = createFlags({ query });
    expect(flags.isEnabled("outfitTips")).toBe(false);
    expect(flags.isEnabled("extendedForecast")).toBe(FLAGS.extendedForecast.default);
  });

  it("returns an independent copy from all()", () => {
    const flags = createFlags();
    const snapshot = flags.all();
    snapshot.outfitTips = !snapshot.outfitTips;
    expect(flags.all().outfitTips).toBe(FLAGS.outfitTips.default);
  });

  it("throws via isEnabled for an unknown flag", () => {
    expect(() => createFlags().isEnabled("nope")).toThrow(/Unknown feature flag/);
  });
});

group("flagsFromBrowser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves defaults when window and localStorage are absent", () => {
    const flags = flagsFromBrowser();
    expect(flags.isEnabled("outfitTips")).toBe(FLAGS.outfitTips.default);
  });

  it("reads overrides from window.location and localStorage", () => {
    vi.stubGlobal("window", {
      location: { search: `?${OVERRIDE_PREFIX}outfitTips=off` }
    });
    vi.stubGlobal("localStorage", makeStorage({ [`${OVERRIDE_PREFIX}extendedForecast`]: "off" }));

    const flags = flagsFromBrowser();
    expect(flags.isEnabled("outfitTips")).toBe(false);
    expect(flags.isEnabled("extendedForecast")).toBe(false);
    expect(flags.isEnabled("fahrenheitToggle")).toBe(FLAGS.fahrenheitToggle.default);
  });
});
