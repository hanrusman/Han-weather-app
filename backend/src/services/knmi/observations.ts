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

/**
 * KNMI parameter codes we surface (and how to read them).
 *
 * Verified against the live `parameter_names` block on the collection
 * metadata endpoint (June 2026). Codes are case-sensitive — lowercase
 * for 1-min/10-min realtime fields, uppercase like `R1H` for aggregated
 * rates.
 */
const PARAMS = {
  ta:  'temperature',       // Air Temperature 1 Min Mean, °C
  td:  'dewPoint',          // Dew Point Temperature 1 Min Mean, °C
  rh:  'humidity',          // Relative Humidity 1 Min Mean, %
  ff:  'windSpeed',         // Wind Speed at 10 m Mean, m/s
  fx:  'windGust',          // Wind Gust at 10 m Maximum, m/s
  dd:  'windDirection',     // Wind Direction Mean, °
  pp:  'pressure',          // Air Pressure at MSL 1 Min Mean, hPa
  vv:  'visibility',        // Horizontal Visibility Mean, m
  qg:  'globalRadiation',   // Global Solar Radiation Mean, W/m²
  n:   'cloudCover',        // Total Cloud Cover, octa
  R1H: 'precipitation',     // Rainfall in last Hour, mm
} as const;

type ParamKey = keyof typeof PARAMS;
type Friendly = (typeof PARAMS)[ParamKey];

const PARAM_QUERY = Object.keys(PARAMS).join(',');
/** EDR rejects queries that span the full dataset history; only ask for the
 *  most recent hour — at one 10-min sample / param that's well below the
 *  300k-datapoints quota. */
const RECENT_WINDOW_MS = 60 * 60 * 1000;

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
    /** Full WIGOS id, e.g. "0-20000-0-06240" — required by /locations/{id} */
    id?: string;
    properties?: { name?: string; wmoId?: string };
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
    // KNMI uses WIGOS station identifiers (e.g. "0-20000-0-06240") at the
    // top level. The shorter WMO code lives in properties.wmoId but isn't
    // a valid lookup key on /locations/{id}.
    const id = String(f.id ?? '').trim();
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
 * EDR returns CoverageJSON. The shape is `CoverageCollection` with one
 * coverage element wrapping the actual `domain` + `ranges`. We unwrap
 * to a single coverage and read latest non-null value per parameter.
 */
interface Coverage {
  domain?: { axes?: { t?: { values?: string[] } } };
  ranges?: Record<string, { values?: (number | null)[] }>;
}
interface CoverageJson extends Coverage {
  /** Present on CoverageCollection responses */
  coverages?: Coverage[];
}

function unwrapCoverage(payload: CoverageJson): Coverage {
  if (payload.coverages?.length) return payload.coverages[0];
  return payload;
}

function extractLatest(payload: CoverageJson): { values: ObservationValues; observedAt: string | null } {
  const coverage = unwrapCoverage(payload);
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

  // Without a `datetime` range EDR refuses queries that exceed 300k data
  // points. Restrict to the most recent hour.
  const end = new Date();
  const start = new Date(end.getTime() - RECENT_WINDOW_MS);
  const isoNoMs = (d: Date) => d.toISOString().replace(/\.\d+/, '');
  const datetime = `${isoNoMs(start)}/${isoNoMs(end)}`;
  const url = `${EDR_BASE}/collections/${COLLECTION}/locations/${encodeURIComponent(station.id)}?parameter-name=${PARAM_QUERY}&datetime=${encodeURIComponent(datetime)}`;
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
