import { describe as group, it, expect, vi } from "vitest";
import { createAnalytics } from "../../src/analytics.js";

group("createAnalytics", () => {
  it("buffers events and returns the recorded entry", () => {
    const a = createAnalytics({ now: () => "2024-01-01T00:00:00.000Z" });
    const rec = a.track("city_search", { city: "London" });
    expect(rec).toEqual({
      event: "city_search",
      props: { city: "London" },
      time: "2024-01-01T00:00:00.000Z"
    });
    expect(a.pending()).toHaveLength(1);
  });

  it("returns an independent copy of the buffer from pending()", () => {
    const a = createAnalytics();
    a.track("x");
    const first = a.pending();
    first.push(/** @type {any} */ ({}));
    expect(a.pending()).toHaveLength(1);
  });

  it("dispatches to an explicit provider sink", () => {
    const provider = vi.fn();
    const a = createAnalytics({ provider });
    a.track("unit_toggle", { unit: "F" });
    expect(provider).toHaveBeenCalledWith("unit_toggle", { unit: "F" });
  });

  it("forwards to PostHog when present on the window", () => {
    const capture = vi.fn();
    const a = createAnalytics({ getWindow: () => ({ posthog: { capture } }) });
    a.track("geolocate", { ok: true });
    expect(capture).toHaveBeenCalledWith("geolocate", { ok: true });
  });

  it("forwards to GA4 gtag with the event shape", () => {
    const gtag = vi.fn();
    const a = createAnalytics({ getWindow: () => ({ gtag }) });
    a.track("forecast_loaded", { days: 6 });
    expect(gtag).toHaveBeenCalledWith("event", "forecast_loaded", { days: 6 });
  });

  it("forwards to Amplitude when present", () => {
    const track = vi.fn();
    const a = createAnalytics({ getWindow: () => ({ amplitude: { track } }) });
    a.track("error_shown", { message: "x" });
    expect(track).toHaveBeenCalledWith("error_shown", { message: "x" });
  });

  it("only buffers when no provider is detected", () => {
    const a = createAnalytics({ getWindow: () => undefined });
    expect(() => a.track("noop")).not.toThrow();
    expect(a.pending()).toHaveLength(1);
  });
});
