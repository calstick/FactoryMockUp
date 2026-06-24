import { describe as group, it, expect, vi } from "vitest";
import { randomHex, createTrace, tracedFetch } from "../../src/trace.js";

group("randomHex", () => {
  it("returns a lowercase-hex string of the requested byte length", () => {
    const hex = randomHex(16);
    expect(hex).toMatch(/^[0-9a-f]{32}$/);
  });

  it("produces different values across calls", () => {
    expect(randomHex(8)).not.toBe(randomHex(8));
  });

  it("falls back to Math.random when Web Crypto is unavailable", () => {
    const original = globalThis.crypto;
    try {
      // @ts-expect-error intentionally remove crypto to exercise the fallback
      delete globalThis.crypto;
      expect(randomHex(8)).toMatch(/^[0-9a-f]{16}$/);
    } finally {
      globalThis.crypto = original;
    }
  });
});

group("createTrace", () => {
  it("keeps a stable trace id and mints fresh span ids", () => {
    const trace = createTrace("00000000000000000000000000000001");
    const a = trace.startSpan();
    const b = trace.startSpan();
    expect(trace.traceId).toBe("00000000000000000000000000000001");
    expect(a.spanId).not.toBe(b.spanId);
  });

  it("emits W3C traceparent and X-Request-Id headers", () => {
    const trace = createTrace("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const { spanId, headers } = trace.startSpan();
    expect(headers.traceparent).toBe(`00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-${spanId}-01`);
    expect(headers["X-Request-Id"]).toBe(`aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-${spanId}`);
  });
});

group("tracedFetch", () => {
  it("propagates trace headers and merges caller headers", async () => {
    const calls = [];
    const fakeFetch = vi.fn(async (input, init) => {
      calls.push({ input, init });
      return { status: 200 };
    });
    const trace = createTrace("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    const fetch = tracedFetch(/** @type {any} */ (fakeFetch), trace);

    await fetch("https://example.test", { headers: { "X-Custom": "1" } });

    const sent = calls[0].init.headers;
    expect(sent.get("x-custom")).toBe("1");
    expect(sent.get("x-request-id")).toContain("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-");
    expect(sent.get("traceparent")).toMatch(/^00-bbbb.+-01$/);
  });

  it("returns the underlying response", async () => {
    const trace = createTrace();
    const fetch = tracedFetch(/** @type {any} */ (async () => ({ status: 204 })), trace);
    const res = await fetch("https://example.test");
    expect(res.status).toBe(204);
  });

  it("rethrows when the underlying fetch rejects", async () => {
    const boom = new Error("network down");
    const trace = createTrace();
    const fetch = tracedFetch(
      /** @type {any} */ (
        async () => {
          throw boom;
        }
      ),
      trace
    );
    await expect(fetch("https://example.test")).rejects.toThrow("network down");
  });
});
