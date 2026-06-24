import { describe as group, it, expect, vi } from "vitest";
import { createMetrics } from "../../src/metrics.js";

group("counters", () => {
  it("increments by 1 by default and by an explicit amount", () => {
    const m = createMetrics();
    expect(m.increment("hits")).toBe(1);
    expect(m.increment("hits")).toBe(2);
    expect(m.increment("hits", 5)).toBe(7);
    expect(m.snapshot().counters.hits).toBe(7);
  });
});

group("timers", () => {
  it("records elapsed time using the injected clock", () => {
    let t = 1000;
    const m = createMetrics({ now: () => t });
    const stop = m.time("api");
    t = 1075;
    expect(stop()).toBe(75);

    const summary = m.snapshot().timings.api;
    expect(summary).toEqual({ count: 1, totalMs: 75, avgMs: 75, maxMs: 75 });
  });

  it("aggregates count, total, average and max across samples", () => {
    const m = createMetrics();
    m.record("api", 10);
    m.record("api", 20);
    m.record("api", 30);
    expect(m.snapshot().timings.api).toEqual({
      count: 3,
      totalMs: 60,
      avgMs: 20,
      maxMs: 30
    });
  });
});

group("flush", () => {
  it("passes the snapshot to an explicit transport", () => {
    const m = createMetrics();
    m.increment("errors", 2);
    const transport = vi.fn();
    const data = m.flush(transport);
    expect(transport).toHaveBeenCalledWith(data);
    expect(data.counters.errors).toBe(2);
  });

  it("beacons to the configured endpoint when no transport is given", () => {
    const beacon = vi.fn(() => true);
    const m = createMetrics({ endpoint: "https://collect.test/m", beacon });
    m.increment("page_view");
    m.flush();
    expect(beacon).toHaveBeenCalledTimes(1);
    const [url, body] = beacon.mock.calls[0];
    expect(url).toBe("https://collect.test/m");
    expect(JSON.parse(body).counters.page_view).toBe(1);
  });

  it("is a no-op transport when no endpoint is configured", () => {
    const m = createMetrics();
    expect(() => m.flush()).not.toThrow();
  });
});
