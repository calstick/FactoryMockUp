import { describe as group, it, expect } from "vitest";
import {
  WEATHER,
  RAIN_CODES,
  SNOW_CODES,
  STORM_CODES,
  describe,
  toDisplay,
  tempStr,
  clothingAdvice,
  feelsNote,
  escapeHtml,
  dayName,
  buildForecastUrl
} from "../../src/weather.js";

group("describe", () => {
  it("returns the matching label and icon for a known code", () => {
    expect(describe(0)).toEqual(WEATHER[0]);
    expect(describe(95).label).toBe("Thunderstorm");
  });

  it("falls back to Unknown for an unrecognized code", () => {
    const result = describe(123456);
    expect(result.label).toBe("Unknown");
    expect(typeof result.icon).toBe("string");
  });
});

group("toDisplay / tempStr", () => {
  it("returns Celsius rounded when unit is C", () => {
    expect(toDisplay(20.4, "C")).toBe(20);
    expect(toDisplay(20.6, "C")).toBe(21);
  });

  it("converts to Fahrenheit when unit is F", () => {
    expect(toDisplay(0, "F")).toBe(32);
    expect(toDisplay(100, "F")).toBe(212);
    expect(toDisplay(37, "F")).toBe(99); // 98.6 rounds to 99
  });

  it("appends the degree symbol", () => {
    expect(tempStr(0, "C")).toBe("0\u00B0");
    expect(tempStr(0, "F")).toBe("32\u00B0");
  });
});

group("clothingAdvice", () => {
  it("classifies temperature bands by feels-like value", () => {
    expect(clothingAdvice(32, 0, 0, 0).headline).toBe("Very hot");
    expect(clothingAdvice(26, 0, 0, 0).headline).toBe("Hot");
    expect(clothingAdvice(22, 0, 0, 0).headline).toBe("Warm");
    expect(clothingAdvice(16, 0, 0, 0).headline).toBe("Mild");
    expect(clothingAdvice(12, 0, 0, 0).headline).toBe("Cool");
    expect(clothingAdvice(6, 0, 0, 0).headline).toBe("Chilly");
    expect(clothingAdvice(2, 0, 0, 0).headline).toBe("Cold");
    expect(clothingAdvice(-5, 0, 0, 0).headline).toBe("Freezing");
  });

  it("adds a storm tip for thunderstorm codes", () => {
    const tips = clothingAdvice(20, STORM_CODES[0], 0, 0).tips;
    expect(tips.some((t) => t.toLowerCase().includes("thunderstorm"))).toBe(true);
  });

  it("adds a rain tip for rain codes or high precipitation probability", () => {
    expect(clothingAdvice(20, RAIN_CODES[0], 0, 0).tips.some((t) => t.includes("umbrella"))).toBe(
      true
    );
    expect(clothingAdvice(20, 0, 0, 80).tips.some((t) => t.includes("umbrella"))).toBe(true);
  });

  it("does not double-count rain advice when a storm is present", () => {
    const tips = clothingAdvice(20, STORM_CODES[0], 0, 90).tips;
    const umbrellaTips = tips.filter((t) => t.includes("umbrella"));
    expect(umbrellaTips.length).toBe(1);
  });

  it("adds snow and wind tips when relevant", () => {
    const tips = clothingAdvice(-2, SNOW_CODES[0], 40, 0).tips;
    expect(tips.some((t) => t.toLowerCase().includes("boots"))).toBe(true);
    expect(tips.some((t) => t.toLowerCase().includes("windproof"))).toBe(true);
  });
});

group("feelsNote", () => {
  it("describes colder, warmer, and close cases", () => {
    expect(feelsNote(10, 5)).toBe("colder than the real temperature");
    expect(feelsNote(10, 15)).toBe("warmer than the real temperature");
    expect(feelsNote(10, 11)).toBe("close to the actual temperature");
  });
});

group("escapeHtml", () => {
  it("escapes HTML-sensitive characters", () => {
    expect(escapeHtml("<script>\"x\"&'y'")).toBe("&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;");
  });

  it("coerces non-string input to a string", () => {
    expect(escapeHtml(42)).toBe("42");
  });
});

group("dayName", () => {
  it("returns Today for index 0", () => {
    expect(dayName("2024-01-01", 0)).toBe("Today");
  });

  it("returns a weekday abbreviation for later days", () => {
    // 2024-01-01 is a Monday.
    expect(dayName("2024-01-01", 1)).toBe("Mon");
  });
});

group("buildForecastUrl", () => {
  it("encodes the coordinates and required query parameters", () => {
    const url = buildForecastUrl(51.5, -0.12);
    expect(url.startsWith("https://api.open-meteo.com/v1/forecast?")).toBe(true);
    expect(url).toContain("latitude=51.5");
    expect(url).toContain("longitude=-0.12");
    expect(url).toContain("forecast_days=6");
    expect(url).toContain("wind_speed_unit=kmh");
  });
});
