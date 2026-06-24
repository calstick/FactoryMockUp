import { describe as group, it, expect, vi } from "vitest";
import { createErrorTracker } from "../../src/error-tracking.js";

group("breadcrumbs", () => {
  it("records breadcrumbs with a default category and timestamp", () => {
    const tracker = createErrorTracker({ now: () => "2024-01-01T00:00:00.000Z" });
    tracker.addBreadcrumb("app started");
    expect(tracker.breadcrumbs()).toEqual([
      { message: "app started", category: "app", time: "2024-01-01T00:00:00.000Z" }
    ]);
  });

  it("caps the trail at maxBreadcrumbs (ring buffer)", () => {
    const tracker = createErrorTracker({ maxBreadcrumbs: 2 });
    tracker.addBreadcrumb("one");
    tracker.addBreadcrumb("two");
    tracker.addBreadcrumb("three");
    const messages = tracker.breadcrumbs().map((b) => b.message);
    expect(messages).toEqual(["two", "three"]);
  });

  it("mirrors breadcrumbs into Sentry when present", () => {
    const addBreadcrumb = vi.fn();
    const tracker = createErrorTracker({ getSentry: () => ({ addBreadcrumb }) });
    tracker.addBreadcrumb("nav", "navigation");
    expect(addBreadcrumb).toHaveBeenCalledWith({ message: "nav", category: "navigation" });
  });
});

group("captureError", () => {
  it("enriches the error with context and a breadcrumb snapshot", () => {
    const tracker = createErrorTracker();
    tracker.setContext({ release: "1.0.0" });
    tracker.addBreadcrumb("clicked search");
    const payload = tracker.captureError(new Error("boom"), { city: "London" });
    expect(payload.release).toBe("1.0.0");
    expect(payload.city).toBe("London");
    expect(payload.breadcrumbs).toHaveLength(1);
  });

  it("forwards the exception and enriched context to Sentry", () => {
    const captureException = vi.fn();
    const tracker = createErrorTracker({ getSentry: () => ({ captureException }) });
    const err = new Error("kaboom");
    tracker.captureError(err, { route: "/forecast" });
    expect(captureException).toHaveBeenCalledTimes(1);
    const [passedErr, opts] = captureException.mock.calls[0];
    expect(passedErr).toBe(err);
    expect(opts.extra.route).toBe("/forecast");
  });
});

group("setContext", () => {
  it("merges context and sets the Sentry user when provided", () => {
    const setUser = vi.fn();
    const tracker = createErrorTracker({ getSentry: () => ({ setUser }) });
    tracker.setContext({ user: { id: "anon-1" } });
    tracker.setContext({ locale: "en" });
    const payload = tracker.captureError(new Error("x"));
    expect(payload.locale).toBe("en");
    expect(setUser).toHaveBeenCalledWith({ id: "anon-1" });
  });
});
