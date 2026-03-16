import { config } from '../config';
import { cache } from '../cache';

export interface StookwijzerData {
  advice: 'code_yellow' | 'code_orange' | 'code_red' | 'code_green';
  label: string;
  description: string;
  windSpeed?: number;
  airQualityIndex?: number;
  fetchedAt: string;
}

const ADVICE_LABELS: Record<string, string> = {
  code_green: 'Stoken mag',
  code_yellow: 'Stoken kan, maar let op',
  code_orange: 'Liever niet stoken',
  code_red: 'Niet stoken',
};

export async function fetchStookwijzer(
  lat: number = config.latitude,
  lon: number = config.longitude
): Promise<StookwijzerData> {
  const cacheKey = `stookwijzer:${lat}:${lon}`;
  const cached = cache.get<StookwijzerData>(cacheKey);
  if (cached) return cached;

  let advice: StookwijzerData['advice'] = 'code_green';
  let description = 'Geen data beschikbaar';
  let windSpeed: number | undefined;
  let airQualityIndex: number | undefined;

  try {
    // Try the Stookwijzer API
    const res = await fetch(
      `https://www.stookwijzer.nu/api/forecast?lat=${lat}&lng=${lon}`
    );
    if (res.ok) {
      const data = (await res.json()) as {
        advice?: StookwijzerData['advice'];
        description?: string;
        windSpeed?: number;
        airQualityIndex?: number;
      };
      if (data.advice) {
        advice = data.advice;
        description = data.description || ADVICE_LABELS[advice] || '';
        windSpeed = data.windSpeed;
        airQualityIndex = data.airQualityIndex;
      }
    }
  } catch (err) {
    console.error('Stookwijzer fetch error:', err);
  }

  const result: StookwijzerData = {
    advice,
    label: ADVICE_LABELS[advice] || 'Onbekend',
    description,
    windSpeed,
    airQualityIndex,
    fetchedAt: new Date().toISOString(),
  };

  cache.set(cacheKey, result, config.cache.stookwijzerTtl);
  return result;
}
