import type { GeocodingResult } from '../types/weather';

interface GeocodingApiResponse {
  results?: GeocodingResult[];
}

export async function searchLocations(query: string): Promise<GeocodingResult[]> {
  if (query.trim().length < 2) return [];

  try {
    const params = new URLSearchParams({
      name: query.trim(),
      count: '5',
      language: 'nl',
      country_code: 'NL',
    });

    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${params}`
    );

    if (!res.ok) return [];

    const data = (await res.json()) as GeocodingApiResponse;
    return data.results ?? [];
  } catch {
    return [];
  }
}
