import { describe as group, it, expect, vi } from "vitest";
import { geocode, fetchForecast } from "../../src/weather.js";

// Build a fetch stub that returns the given payloads in sequence.
function makeFetch(...responses) {
  const calls = [];
  const impl = vi.fn(async (url) => {
    calls.push(url);
    const next = responses.shift();
    if (!next) throw new Error("unexpected fetch call");
    return {
      ok: next.ok !== false,
      json: async () => next.body
    };
  });
  impl.calls = calls;
  return impl;
}

group("geocode (integration with injected fetch)", () => {
  it("resolves a city name to coordinates and a friendly label", async () => {
    const fetchImpl = makeFetch({
      body: {
        results: [
          {
            name: "London",
            admin1: "England",
            country: "United Kingdom",
            latitude: 51.5,
            longitude: -0.12
          }
        ]
      }
    });

    const place = await geocode("London", fetchImpl);

    expect(place).toEqual({ lat: 51.5, lon: -0.12, name: "London, England, United Kingdom" });
    expect(fetchImpl.calls[0]).toContain("name=London");
  });

  it("throws a helpful error when no city matches", async () => {
    const fetchImpl = makeFetch({ body: { results: [] } });
    await expect(geocode("Nowhereville", fetchImpl)).rejects.toThrow("No matching city found.");
  });

  it("throws when the geocoding request fails", async () => {
    const fetchImpl = makeFetch({ ok: false, body: {} });
    await expect(geocode("London", fetchImpl)).rejects.toThrow("Geocoding failed");
  });
});

group("fetchForecast (integration with injected fetch)", () => {
  it("returns forecast data annotated with the place name", async () => {
    const payload = { current: { temperature_2m: 12 }, daily: { time: ["2024-01-01"] } };
    const fetchImpl = makeFetch({ body: payload });

    const data = await fetchForecast(51.5, -0.12, "London, England, United Kingdom", fetchImpl);

    expect(data.placeName).toBe("London, England, United Kingdom");
    expect(data.current.temperature_2m).toBe(12);
    expect(fetchImpl.calls[0]).toContain("latitude=51.5");
  });

  it("defaults the place name when none is supplied", async () => {
    const fetchImpl = makeFetch({ body: { current: {}, daily: {} } });
    const data = await fetchForecast(0, 0, "", fetchImpl);
    expect(data.placeName).toBe("Selected location");
  });

  it("throws when the forecast request fails", async () => {
    const fetchImpl = makeFetch({ ok: false, body: {} });
    await expect(fetchForecast(0, 0, "x", fetchImpl)).rejects.toThrow(
      "Could not load the forecast."
    );
  });
});
