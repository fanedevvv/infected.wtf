// Free, keyless weather lookup (Open-Meteo) driven by the profile's own
// "location" text field — no API key to configure, no per-user setup.

export type WeatherSnapshot = { tempC: number; code: number; description: string; location: string };

/** WMO weather codes -> short label. https://open-meteo.com/en/docs */
const WEATHER_CODE_LABEL: Record<number, string> = {
  0: "Clear sky", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Icy fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  56: "Freezing drizzle", 57: "Freezing drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  66: "Freezing rain", 67: "Freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Light showers", 81: "Showers", 82: "Violent showers",
  85: "Snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Thunderstorm w/ hail",
};

function label(code: number): string {
  return WEATHER_CODE_LABEL[code] || "Unknown";
}

async function fetchJson(url: string, timeoutMs: number) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), next: { revalidate: 1800 } });
  if (!res.ok) return null;
  return res.json();
}

/** Resolves a free-text location (e.g. "Oslo", "Cluj-Napoca, Romania") to
 *  current conditions. Returns null on any failure — a weather widget is
 *  never worth breaking a profile page over. */
export async function getWeatherForLocation(location: string | null | undefined): Promise<WeatherSnapshot | null> {
  const query = (location || "").trim();
  if (!query || query.length > 100) return null;

  try {
    const geo = await fetchJson(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`,
      4000
    );
    const place = geo?.results?.[0];
    if (!place || typeof place.latitude !== "number" || typeof place.longitude !== "number") return null;

    const weather = await fetchJson(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code`,
      4000
    );
    const current = weather?.current;
    if (!current || typeof current.temperature_2m !== "number") return null;

    return {
      tempC: Math.round(current.temperature_2m),
      code: current.weather_code ?? 0,
      description: label(current.weather_code ?? 0),
      location: place.name,
    };
  } catch {
    return null;
  }
}
