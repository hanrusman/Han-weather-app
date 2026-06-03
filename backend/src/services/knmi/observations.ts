/**
 * KNMI in-situ observations via the EDR API.
 *
 * Collection: `10-minute-in-situ-meteorological-observations`
 *
 * Strategy:
 *  - Cache the station catalog (~50 NL stations, ~stable for weeks).
 *  - Per query: find nearest station by lat/lon, fetch its latest values.
 *  - Map KNMI parameter codes → friendly fields (ta=temp, uu=humidity, …).
 */

import { config } from '../../config';
import { cache } from '../../cache';
import { knmiGetJson, haversineKm } from './client';

const EDR_BASE = 'https://api.dataplatform.knmi.nl/edr/v1';
const COLLECTION = '10-minute-in-situ-meteorological-observations';

/** KNMI parameter codes we surface (and how to read them). */
const PARAMS = {
  ta: 'temperature',          // air temperature, °C
  td: 'dewPoint',             // dew point, °C
  uu: 'humidity',             // relative humidity, %
  ff: 'windSpeed',            // 10-min mean wind speed, m/s
  fx: 'windGust',             // wind gust, m/s
  dd: 'windDirection',        // wind direction, °
  pp: 'pressure',             // sea-level pressure, hPa
  vv: 'visibility',           // horizontal visibility, m
  sq: 'sunshineDuration',     // sunshine duration last 10 min, min
  Q: 'globalRadiation',       // global radiation, W/m²
  nc: 'cloudCover',           // cloud cover, octa
  rh: 'precipitation',        // precipitation last 10 min, mm
} as const;

type ParamKey = keyof typeof PARAMS;
type Friendly = (typeof PARAMS)[ParamKey];

const PARAM_QUERY = Object.keys(PARAMS).join(',');

export interface ObservationStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceKm?: number;
}

export interface ObservationValues {
  temperature?: number;
  dewPoint?: number;
  humidity?: number;
  windSpeed?: number;      // m/s
  windGust?: number;       // m/s
  windDirection?: number;
  pressure?: number;
  visibility?: number;     // m
  sunshineDuration?: number; // min in last 10 min
  globalRadiation?: number;  // W/m²
  cloudCover?: number;       // octa
  precipitation?: number;    // mm last 10 min
}

export interface ObservationsResponse {
  station: ObservationStation | null;
  values: ObservationValues;
  observedAt: string | null;
  fetchedAt: string;
  source: 'ok' | 'no-key' | 'unauthorized' | 'error' | 'no-data';
}

interface LocationsGeoJson {
  features?: {
    id?: string;
    properties?: { name?: string; id?: string };
    geometry?: { coordinates?: [number, number] }; // [lon, lat]
  }[];
}

async function fetchStations(): Promise<ObservationStation[]> {
  const key = 'knmi:edr:stations';
  const cached = cache.get<ObservationStation[]>(key);
  if (cached) return cached;

  const r = await knmiGetJson<LocationsGeoJson>(
    `${EDR_BASE}/collections/${COLLECTION}/locations`,
    config.knmiEdrApiKey,
    { logLabel: 'edr:locations' },
  );
  if (!r.data?.features?.length) return [];

  const stations: ObservationStation[] = [];
  for (const f of r.data.features) {
    const id = String(f.properties?.id ?? f.id ?? '').trim();
    const coords = f.geometry?.coordinates;
    if (!id || !coords) continue;
    stations.push({
      id,
      name: f.properties?.name ?? id,
      latitude: coords[1],
      longitude: coords[0],
    });
  }
  cache.set(key, stations, config.cache.stationsTtl);
  return stations;
}

/** Pick station closest to (lat, lon) by great-circle distance. */
function nearestStation(stations: ObservationStation[], lat: number, lon: number): ObservationStation | null {
  let best: ObservationStation | null = null;
  let bestKm = Infinity;
  for (const s of stations) {
    const km = haversineKm(lat, lon, s.latitude, s.longitude);
    if (km < bestKm) {
      bestKm = km;
      best = { ...s, distanceKm: km };
    }
  }
  return best;
}

/**
 * EDR response is CoverageJSON. Two shapes seen in the wild:
 *   { ranges: { ta: { values: [...] }, … }, domain: { axes: { t: { values: [iso] } } } }
 *   { parameters: { ta: { ... } }, ranges: { … } }
 * We just look at `ranges[*].values` and assume the latest index = newest.
 */
interface CoverageJson {
  domain?: { axes?: { t?: { values?: string[] } } };
  ranges?: Record<string, { values?: (number | null)[] }>;
}

function extractLatest(coverage: CoverageJson): { values: ObservationValues; observedAt: string | null } {
  const out: ObservationValues = {};
  let observedAt: string | null = null;

  const timeValues = coverage.domain?.axes?.t?.values;
  if (Array.isArray(timeValues) && timeValues.length) {
    observedAt = String(timeValues[timeValues.length - 1]);
  }

  for (const [code, friendly] of Object.entries(PARAMS) as [ParamKey, Friendly][]) {
    const range = coverage.ranges?.[code];
    const arr = range?.values;
    if (!Array.isArray(arr) || arr.length === 0) continue;
    // walk from the end to find the most recent non-null
    for (let i = arr.length - 1; i >= 0; i--) {
      const v = arr[i];
      if (v != null && typeof v === 'number' && Number.isFinite(v)) {
        out[friendly] = v;
        break;
      }
    }
  }
  return { values: out, observedAt };
}

export async function fetchObservations(lat: number, lon: number): Promise<ObservationsResponse> {
  const cacheKey = `obs:${lat.toFixed(2)}:${lon.toFixed(2)}`;
  const cached = cache.get<ObservationsResponse>(cacheKey);
  if (cached) return cached;

  const baseResp: ObservationsResponse = {
    station: null,
    values: {},
    observedAt: null,
    fetchedAt: new Date().toISOString(),
    source: 'no-data',
  };

  if (!config.knmiEdrApiKey) {
    return { ...baseResp, source: 'no-key' };
  }

  const stations = await fetchStations();
  if (!stations.length) {
    cache.set(cacheKey, { ...baseResp, source: 'unauthorized' }, 60_000);
    return { ...baseResp, source: 'unauthorized' };
  }

  const station = nearestStation(stations, lat, lon);
  if (!station) return baseResp;

  const url = `${EDR_BASE}/collections/${COLLECTION}/locations/${encodeURIComponent(station.id)}?parameter-name=${PARAM_QUERY}`;
  const r = await knmiGetJson<CoverageJson>(url, config.knmiEdrApiKey, { logLabel: 'edr:obs' });
  if (!r.data) {
    const status: ObservationsResponse['source'] =
      r.status === 'unauthorized' ? 'unauthorized' : r.status === 'no-key' ? 'no-key' : 'error';
    cache.set(cacheKey, { ...baseResp, station, source: status }, 60_000);
    return { ...baseResp, station, source: status };
  }

  const { values, observedAt } = extractLatest(r.data);
  const result: ObservationsResponse = {
    station,
    values,
    observedAt,
    fetchedAt: new Date().toISOString(),
    source: Object.keys(values).length ? 'ok' : 'no-data',
  };
  cache.set(cacheKey, result, config.cache.observationsTtl);
  return result;
}
