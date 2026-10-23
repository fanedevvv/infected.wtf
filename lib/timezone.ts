// Resolves a profile's free-text "location" to an IANA timezone, for the
// Clock widget — same keyless Open-Meteo geocoder the weather widget uses,
// kept separate so a failure in one never affects the other.
export async function getTimezoneForLocation(location: string | null | undefined): Promise<string | null> {
  const query = (location || "").trim();
  if (!query || query.length > 100) return null;
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`,
      { signal: AbortSignal.timeout(4000), next: { revalidate: 1800 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const tz = json?.results?.[0]?.timezone;
    return typeof tz === "string" ? tz : null;
  } catch {
    return null;
  }
}
