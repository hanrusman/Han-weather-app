/**
 * Climate normals for "today" (month-day) from KNMI validated daily series.
 *
 * EDR collection `daily-in-situ-meteorological-observations-validated` exposes
 * daily Tg (mean), Tx (max), Tn (min) and Rd (precip) per station. We request a
 * 30-year window for the same calendar day, then compute mean/min/max and
 * surface those as "normal" values.
 *
 * Note: the validated dataset lags ~3 weeks behind realtime, which is fine for
 * climate normals (we only need the same calendar day from past years).
 */

import { config } from '../../config';
import { cache } from '../../cache';
import { knmiGetJson, haversineKm } from './client';

const EDR_BASE = 'https://api.dataplatform.knmi.nl/edr/v1';
const COLLECTION = 'daily-in-situ-meteorological-observations-validated';

// 30-year window ending 1 year ago (validated data lags realtime)
const REFERENCE_END_YEARS_BACK = 1;
const REFERENCE_WINDOW_YEARS = 30;

export interface ClimateNormal {
  /** mean (°C) — over reference window */
  meanT?: number;
  /** mean max (°C) */
  meanTmax?: number;
  /** mean min (°C) */
  meanTmin?: number;
  /** mean daily precipitation (mm) */
  meanPrecip?: number;
  /** record max (°C) in this calendar day across reference years */
  recordTmax?: number;
  /** record min (°C) */
  recordTmin?: number;
  /** number of years used */
  samples: number;
}

export interface ClimateResponse {
  stationId: string | null;
  stationName: string | null;
  /** Month-day this normal is for, e.g. "06-03" */
  monthDay: string;
  /** Reference window used, e.g. "1995-2024" */
  referenceWindow: string;
  normal: ClimateNormal | null;
  fetchedAt: string;
  source: 'ok' | 'no-key' | 'unauthorized' | 'error' | 'no-data';
}

interface LocationsGeoJson {
  features?: {
    id?: string;
    properties?: { name?: string; id?: string };
    geometry?: { coordinates?: [number, number] };
  }[];
}

interface CoverageJson {
  domain?: { axes?: { t?: { values?: string[] } } };
  ranges?: Record<string, { values?: (number | null)[] }>;
}

async function fetchClimateStations(): Promise<{ id: string; name: string; latitude: number; longitude: number }[]> {
  const key = 'knmi:edr:climateStations';
  const cached = cache.get<{ id: string; name: string; latitude: number; longitude: number }[]>(key);
  if (cached) return cached;

  const r = await knmiGetJson<LocationsGeoJson>(
    `${EDR_BASE}/collections/${COLLECTION}/locations`,
    config.knmiEdrApiKey,
    { logLabel: 'climate:locations' },
  );
  if (!r.data?.features?.length) return [];

  const stations = r.data.features
    .map((f) => {
      const id = String(f.properties?.id ?? f.id ?? '').trim();
      const coords = f.geometry?.coordinates;
      if (!id || !coords) return null;
      return {
        id,
        name: f.properties?.name ?? id,
        latitude: coords[1],
        longitude: coords[0],
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  cache.set(key, stations, config.cache.stationsTtl);
  return stations;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Pick out values from the CoverageJSON whose time matches the given month-day. */
function valuesForMonthDay(coverage: CoverageJson, paramCode: string, monthDay: string): number[] {
  const times = coverage.domain?.axes?.t?.values;
  const values = coverage.ranges?.[paramCode]?.values;
  if (!Array.isArray(times) || !Array.isArray(values)) return [];
  const out: number[] = [];
  for (let i = 0; i < times.length && i < values.length; i++) {
    const time = String(times[i]);
    // ISO date 'YYYY-MM-DDTHH:mm:ssZ' — substring 5..10 = 'MM-DD'
    if (time.length >= 10 && time.slice(5, 10) === monthDay) {
      const v = values[i];
      if (v != null && typeof v === 'number' && Number.isFinite(v)) out.push(v);
    }
  }
  return out;
}

function summary(values: number[]): { mean?: number; min?: number; max?: number } {
  if (!values.length) return {};
  const sum = values.reduce((s, v) => s + v, 0);
  return {
    mean: sum / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export async function fetchClimateNormal(lat: number, lon: number): Promise<ClimateResponse> {
  const today = new Date();
  const monthDay = `${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
  const endYear = today.getFullYear() - REFERENCE_END_YEARS_BACK;
  const startYear = endYear - REFERENCE_WINDOW_YEARS + 1;
  const referenceWindow = `${startYear}-${endYear}`;

  const cacheKey = `climate:${lat.toFixed(2)}:${lon.toFixed(2)}:${monthDay}`;
  const cached = cache.get<ClimateResponse>(cacheKey);
  if (cached) return cached;

  const base: ClimateResponse = {
    stationId: null,
    stationName: null,
    monthDay,
    referenceWindow,
    normal: null,
    fetchedAt: new Date().toISOString(),
    source: 'no-data',
  };

  if (!config.knmiEdrApiKey) return { ...base, source: 'no-key' };

  const stations = await fetchClimateStations();
  if (!stations.length) {
    cache.set(cacheKey, { ...base, source: 'unauthorized' }, 60_000);
    return { ...base, source: 'unauthorized' };
  }

  let best: (typeof stations)[number] | null = null;
  let bestKm = Infinity;
  for (const s of stations) {
    const km = haversineKm(lat, lon, s.latitude, s.longitude);
    if (km < bestKm) {
      bestKm = km;
      best = s;
    }
  }
  if (!best) return base;

  // Datetime range covers the whole reference window.
  // We over-fetch (all days) and filter by month-day client-side to keep things simple.
  const datetime = `${startYear}-01-01T00:00:00Z/${endYear}-12-31T23:59:59Z`;
  const url = `${EDR_BASE}/collections/${COLLECTION}/locations/${encodeURIComponent(best.id)}?parameter-name=TG,TX,TN,RH&datetime=${encodeURIComponent(datetime)}`;
  const r = await knmiGetJson<CoverageJson>(url, config.knmiEdrApiKey, { logLabel: 'climate:obs' });
  if (!r.data) {
    const status: ClimateResponse['source'] =
      r.status === 'unauthorized' ? 'unauthorized' : r.status === 'no-key' ? 'no-key' : 'error';
    cache.set(cacheKey, { ...base, stationId: best.id, stationName: best.name, source: status }, 60_000);
    return { ...base, stationId: best.id, stationName: best.name, source: status };
  }

  const tg = valuesForMonthDay(r.data, 'TG', monthDay);
  const tx = valuesForMonthDay(r.data, 'TX', monthDay);
  const tn = valuesForMonthDay(r.data, 'TN', monthDay);
  const rh = valuesForMonthDay(r.data, 'RH', monthDay);

  // Tg/Tx/Tn in KNMI validated dataset are in 0.1°C — divide by 10 if they look like ints.
  // Heuristic: if mean abs > 100 we're in 0.1° units.
  function maybeScale(values: number[]): number[] {
    if (!values.length) return values;
    const meanAbs = values.reduce((s, v) => s + Math.abs(v), 0) / values.length;
    return meanAbs > 100 ? values.map((v) => v / 10) : values;
  }
  const tgS = maybeScale(tg);
  const txS = maybeScale(tx);
  const tnS = maybeScale(tn);
  // Rd (precipitation, 0.1 mm) — divide by 10 always
  const rhS = rh.map((v) => v / 10);

  const samples = Math.max(tgS.length, txS.length, tnS.length, rhS.length);
  const sTg = summary(tgS);
  const sTx = summary(txS);
  const sTn = summary(tnS);
  const sRh = summary(rhS);

  const normal: ClimateNormal | null = samples > 0
    ? {
        meanT: sTg.mean,
        meanTmax: sTx.mean,
        meanTmin: sTn.mean,
        meanPrecip: sRh.mean,
        recordTmax: sTx.max,
        recordTmin: sTn.min,
        samples,
      }
    : null;

  const result: ClimateResponse = {
    stationId: best.id,
    stationName: best.name,
    monthDay,
    referenceWindow,
    normal,
    fetchedAt: new Date().toISOString(),
    source: normal ? 'ok' : 'no-data',
  };
  cache.set(cacheKey, result, config.cache.climateTtl);
  return result;
}
