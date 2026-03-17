export function formatTemp(value: number): string {
  return `${Math.round(value)}°`;
}

export function formatTempFull(value: number): string {
  return `${value.toFixed(1)}°C`;
}

const BEAUFORT_THRESHOLDS = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];

export function kmhToBeaufort(kmh: number): number {
  for (let i = 0; i < BEAUFORT_THRESHOLDS.length; i++) {
    if (kmh < BEAUFORT_THRESHOLDS[i]) return i;
  }
  return 12;
}

export function formatWind(value: number): string {
  return `${kmhToBeaufort(value)} bft`;
}

export function formatWindFull(value: number): string {
  return `${kmhToBeaufort(value)} bft (${Math.round(value)} km/u)`;
}

export function formatPrecip(value: number): string {
  return `${value.toFixed(1)} mm`;
}

export function formatPressure(value: number): string {
  return `${Math.round(value)} hPa`;
}

export function formatHumidity(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDayShort(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('nl-NL', { weekday: 'short' });
}

export function averageValues(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// ─── Wind direction ────────────────────────────────────────────

const COMPASS_NL = ['N', 'NO', 'O', 'ZO', 'Z', 'ZW', 'W', 'NW'] as const;

/** Convert wind degrees (0-360) to Dutch compass abbreviation */
export function degreesToCompass(degrees: number): string {
  return COMPASS_NL[Math.round(degrees / 45) % 8];
}

// ─── UV index ──────────────────────────────────────────────────

export interface UvAdvice {
  label: string;
  advice: string;
  burnTime?: number;
}

/** UV advice for skin type II-III (common in NL) */
export function formatUvAdvice(uvIndex: number): UvAdvice {
  if (uvIndex < 1) return { label: 'UV 0', advice: 'Geen bescherming nodig' };
  if (uvIndex <= 2) return { label: `UV ${Math.round(uvIndex)}`, advice: 'Geen bescherming nodig' };

  const burnTime = Math.round(200 / uvIndex);

  if (uvIndex <= 5) return { label: `UV ${Math.round(uvIndex)}`, advice: 'Insmeren bij langdurig buiten', burnTime };
  if (uvIndex <= 7) return { label: `UV ${Math.round(uvIndex)}`, advice: 'Zeker insmeren!', burnTime };
  return { label: `UV ${Math.round(uvIndex)}`, advice: 'Vermijd de zon tussen 12–15u', burnTime };
}

// ─── Air quality ───────────────────────────────────────────────

export type AqLevel = 'goed' | 'redelijk' | 'matig' | 'slecht' | 'zeer_slecht';

export interface AqAdvice {
  label: string;
  sport: string;
  level: AqLevel;
}

/** European AQI → Dutch label + sport advice */
export function formatAirQuality(aqi: number): AqAdvice {
  if (aqi <= 20) return { label: 'Uitstekend', sport: 'Ideaal om buiten te sporten', level: 'goed' };
  if (aqi <= 40) return { label: 'Goed', sport: 'Geschikt om buiten te sporten', level: 'goed' };
  if (aqi <= 60) return { label: 'Redelijk', sport: 'Geschikt om buiten te sporten', level: 'redelijk' };
  if (aqi <= 80) return { label: 'Matig', sport: 'Beperk intensief sporten buiten', level: 'matig' };
  if (aqi <= 100) return { label: 'Slecht', sport: 'Vermijd intensief sporten buiten', level: 'slecht' };
  return { label: 'Zeer slecht', sport: 'Niet buiten sporten', level: 'zeer_slecht' };
}
