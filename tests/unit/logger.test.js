import { describe as group, it, expect, vi } from "vitest";
import { createLogger, scrub, SENSITIVE_KEYS } from "../../src/logger.js";

// A console-shaped sink that captures emitted records per level.
function makeSink() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  };
}

function lastRecord(fn) {
  return JSON.parse(fn.mock.calls[fn.mock.calls.length - 1][0]);
}

group("scrub", () => {
  it("redacts sensitive keys at any depth", () => {
    const input = { city: "London", lat: 51.5, nested: { lon: -0.12, label: "ok" } };
    const out = scrub(input);
    expect(out).toEqual({
      city: "London",
      lat: "[REDACTED]",
      nested: { lon: "[REDACTED]", label: "ok" }
    });
  });

  it("redacts sensitive keys inside arrays", () => {
    const out = scrub([{ token: "abc", keep: 1 }]);
    expect(out).toEqual([{ token: "[REDACTED]", keep: 1 }]);
  });

  it("does not mutate the original input", () => {
    const input = { lat: 1 };
    scrub(input);
    expect(input.lat).toBe(1);
  });

  it("guards against circular references", () => {
    const a = { name: "a" };
    a.self = a;
    const out = scrub(a);
    expect(out.self).toBe("[Circular]");
  });

  it("passes primitives through unchanged", () => {
    expect(scrub(42)).toBe(42);
    expect(scrub("x")).toBe("x");
    expect(scrub(null)).toBe(null);
  });

  it("exposes the coordinate keys it scrubs", () => {
    expect(SENSITIVE_KEYS).toContain("lat");
    expect(SENSITIVE_KEYS).toContain("longitude");
  });
});

group("createLogger", () => {
  it("emits a single-line JSON record with level, time, msg and context", () => {
    const sink = makeSink();
    const log = createLogger({ sink, now: () => "2024-01-01T00:00:00.000Z" });
    log.info("hello", { city: "London" });

    expect(sink.info).toHaveBeenCalledTimes(1);
    const out = sink.info.mock.calls[0][0];
    expect(typeof out).toBe("string");
    expect(out).not.toContain("\n");
    expect(JSON.parse(out)).toEqual({
      level: "info",
      time: "2024-01-01T00:00:00.000Z",
      msg: "hello",
      city: "London"
    });
  });

  it("scrubs sensitive context fields before output", () => {
    const sink = makeSink();
    const log = createLogger({ sink });
    log.info("located", { city: "London", lat: 51.5, lon: -0.12 });
    const record = lastRecord(sink.info);
    expect(record.city).toBe("London");
    expect(record.lat).toBe("[REDACTED]");
    expect(record.lon).toBe("[REDACTED]");
  });

  it("respects the configured minimum level", () => {
    const sink = makeSink();
    const log = createLogger({ sink, level: "warn" });
    log.debug("ignored");
    log.info("ignored");
    log.warn("kept");
    expect(sink.debug).not.toHaveBeenCalled();
    expect(sink.info).not.toHaveBeenCalled();
    expect(sink.warn).toHaveBeenCalledTimes(1);
  });

  it("serializes an Error argument into a scrubbed error field", () => {
    const sink = makeSink();
    const log = createLogger({ sink });
    log.error("boom", { city: "London" }, new Error("kaboom"));
    const record = lastRecord(sink.error);
    expect(record.error.name).toBe("Error");
    expect(record.error.message).toBe("kaboom");
    expect(typeof record.error.stack).toBe("string");
  });

  it("merges child bindings into every record", () => {
    const sink = makeSink();
    const log = createLogger({ sink }).child({ component: "weather" });
    log.info("event");
    expect(lastRecord(sink.info).component).toBe("weather");
  });
});
