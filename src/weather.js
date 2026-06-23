// Pure weather/forecast logic for the "Weather & What to Wear" app.
// Kept free of DOM access so it can be unit-tested in Node and reused in the browser.

/**
 * @typedef {Object} WeatherInfo
 * @property {string} label
 * @property {string} icon
 */

/** @type {Record<number, WeatherInfo>} */
export const WEATHER = {
  0: { label: "Clear sky", icon: "\u2600\uFE0F" },
  1: { label: "Mainly clear", icon: "\uD83C\uDF24\uFE0F" },
  2: { label: "Partly cloudy", icon: "\u26C5" },
  3: { label: "Overcast", icon: "\u2601\uFE0F" },
  45: { label: "Fog", icon: "\uD83C\uDF2B\uFE0F" },
  48: { label: "Rime fog", icon: "\uD83C\uDF2B\uFE0F" },
  51: { label: "Light drizzle", icon: "\uD83C\uDF26\uFE0F" },
  53: { label: "Drizzle", icon: "\uD83C\uDF26\uFE0F" },
  55: { label: "Heavy drizzle", icon: "\uD83C\uDF26\uFE0F" },
  56: { label: "Freezing drizzle", icon: "\uD83C\uDF27\uFE0F" },
  57: { label: "Freezing drizzle", icon: "\uD83C\uDF27\uFE0F" },
  61: { label: "Light rain", icon: "\uD83C\uDF27\uFE0F" },
  63: { label: "Rain", icon: "\uD83C\uDF27\uFE0F" },
  65: { label: "Heavy rain", icon: "\uD83C\uDF27\uFE0F" },
  66: { label: "Freezing rain", icon: "\uD83C\uDF27\uFE0F" },
  67: { label: "Freezing rain", icon: "\uD83C\uDF27\uFE0F" },
  71: { label: "Light snow", icon: "\uD83C\uDF28\uFE0F" },
  73: { label: "Snow", icon: "\uD83C\uDF28\uFE0F" },
  75: { label: "Heavy snow", icon: "\u2744\uFE0F" },
  77: { label: "Snow grains", icon: "\uD83C\uDF28\uFE0F" },
  80: { label: "Light showers", icon: "\uD83C\uDF26\uFE0F" },
  81: { label: "Showers", icon: "\uD83C\uDF27\uFE0F" },
  82: { label: "Violent showers", icon: "\u26C8\uFE0F" },
  85: { label: "Snow showers", icon: "\uD83C\uDF28\uFE0F" },
  86: { label: "Snow showers", icon: "\u2744\uFE0F" },
  95: { label: "Thunderstorm", icon: "\u26C8\uFE0F" },
  96: { label: "Thunderstorm + hail", icon: "\u26C8\uFE0F" },
  99: { label: "Thunderstorm + hail", icon: "\u26C8\uFE0F" }
};

export const RAIN_CODES = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82];
export const SNOW_CODES = [71, 73, 75, 77, 85, 86];
export const STORM_CODES = [95, 96, 99];

/** @type {WeatherInfo} */
const UNKNOWN = { label: "Unknown", icon: "\uD83C\uDF21\uFE0F" };

/**
 * Map an Open-Meteo weather code to its label and icon.
 * @param {number} code
 * @returns {WeatherInfo}
 */
export function describe(code) {
  return WEATHER[code] || UNKNOWN;
}

/**
 * Convert a Celsius value to the requested display unit, rounded.
 * @param {number} celsius
 * @param {"C" | "F"} unit
 * @returns {number}
 */
export function toDisplay(celsius, unit) {
  const t = unit === "F" ? (celsius * 9) / 5 + 32 : celsius;
  return Math.round(t);
}

/**
 * Format a Celsius value as a degree-suffixed string in the requested unit.
 * @param {number} celsius
 * @param {"C" | "F"} unit
 * @returns {string}
 */
export function tempStr(celsius, unit) {
  return toDisplay(celsius, unit) + "\u00B0";
}

/**
 * @typedef {Object} Advice
 * @property {string} headline
 * @property {string[]} tips
 */

/**
 * Outfit advice driven primarily by the "feels like" temperature,
 * then nudged by precipitation, snow, storms and wind.
 * @param {number} feelsC
 * @param {number} code
 * @param {number} windKmh
 * @param {number} precipProb
 * @returns {Advice}
 */
export function clothingAdvice(feelsC, code, windKmh, precipProb) {
  /** @type {string[]} */
  const tips = [];
  let headline;

  if (feelsC >= 30) {
    headline = "Very hot";
    tips.push(
      "Light, breathable clothes (t-shirt, shorts)",
      "Sunglasses, a hat and sunscreen",
      "Drink water and find shade"
    );
  } else if (feelsC >= 25) {
    headline = "Hot";
    tips.push("T-shirt and shorts or a light dress", "Sunglasses and sunscreen");
  } else if (feelsC >= 20) {
    headline = "Warm";
    tips.push("T-shirt with light trousers", "A thin layer for the evening");
  } else if (feelsC >= 15) {
    headline = "Mild";
    tips.push("Long sleeves or a light sweater");
  } else if (feelsC >= 10) {
    headline = "Cool";
    tips.push("A sweater plus a light jacket");
  } else if (feelsC >= 5) {
    headline = "Chilly";
    tips.push("Warm jacket and a couple of layers");
  } else if (feelsC >= 0) {
    headline = "Cold";
    tips.push("Warm coat, a hat and gloves");
  } else {
    headline = "Freezing";
    tips.push("Heavy winter coat, hat, gloves and scarf", "Thermal base layers underneath");
  }

  if (STORM_CODES.includes(code)) {
    tips.push("Thunderstorms about \u2013 a sturdy umbrella, or stay indoors");
  } else if (RAIN_CODES.includes(code) || precipProb >= 50) {
    tips.push("Bring an umbrella or a waterproof jacket");
  }
  if (SNOW_CODES.includes(code)) {
    tips.push("Waterproof boots and water-resistant layers");
  }
  if (windKmh >= 30) {
    tips.push("Windy \u2013 a windproof outer layer helps");
  }

  return { headline, tips };
}

/**
 * Describe how the "feels like" temperature compares to the actual one.
 * @param {number} actualC
 * @param {number} feelsC
 * @returns {string}
 */
export function feelsNote(actualC, feelsC) {
  const diff = feelsC - actualC;
  if (diff <= -3) return "colder than the real temperature";
  if (diff >= 3) return "warmer than the real temperature";
  return "close to the actual temperature";
}

/** @type {Record<string, string>} */
const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

/**
 * Escape HTML-sensitive characters so untrusted text can be inserted safely.
 * @param {unknown} s
 * @returns {string}
 */
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/**
 * Human-friendly day label for a forecast entry ("Today" for index 0).
 * @param {string} isoDate
 * @param {number} index
 * @returns {string}
 */
export function dayName(isoDate, index) {
  if (index === 0) return "Today";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

/**
 * @typedef {Object} Place
 * @property {number} lat
 * @property {number} lon
 * @property {string} name
 */

/**
 * Resolve a city name to coordinates via the Open-Meteo geocoding API.
 * `fetchImpl` is injectable so the network layer can be tested with a stub.
 * @param {string} city
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<Place>}
 */
export async function geocode(city, fetchImpl = fetch) {
  const url =
    "https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=" +
    encodeURIComponent(city);
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error("Geocoding failed");
  const data = await res.json();
  if (!data.results || data.results.length === 0) throw new Error("No matching city found.");
  const r = data.results[0];
  return {
    lat: r.latitude,
    lon: r.longitude,
    name: [r.name, r.admin1, r.country].filter(Boolean).join(", ")
  };
}

/**
 * Build the Open-Meteo forecast request URL for a coordinate pair.
 * @param {number} lat
 * @param {number} lon
 * @returns {string}
 */
export function buildForecastUrl(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_probability_max,wind_speed_10m_max",
    timezone: "auto",
    forecast_days: "6",
    wind_speed_unit: "kmh"
  });
  return "https://api.open-meteo.com/v1/forecast?" + params.toString();
}

/**
 * Fetch the forecast for a coordinate pair and annotate it with a place name.
 * @param {number} lat
 * @param {number} lon
 * @param {string} name
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<any>}
 */
export async function fetchForecast(lat, lon, name, fetchImpl = fetch) {
  const res = await fetchImpl(buildForecastUrl(lat, lon));
  if (!res.ok) throw new Error("Could not load the forecast.");
  const data = await res.json();
  data.placeName = name || "Selected location";
  return data;
}
