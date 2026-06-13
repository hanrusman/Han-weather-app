/**
 * KNMI radar via WMS GetMap.
 *
 * The KNMI WMS endpoint serves rendered radar precipitation tiles. We expose:
 *  - /api/radar.png?lat&lon&zoom  → backend proxies the rendered PNG so the
 *    auth key never leaves the server.
 *  - /api/radar (existing JSON)   → returns metadata + URLs the frontend can use.
 *
 * When the WMS key is missing, we keep falling back to the public KNMI CDN GIF
 * so the radar tile still shows something.
 */

import { config } from '../../config';
import { cache } from '../../cache';

const WMS_BASE = 'https://api.dataplatform.knmi.nl/wms/v1/RADNL_OPER_R___25PCPRR_L3_KNMI';
const FALLBACK_IMAGE = 'https://cdn.knmi.nl/knmi/map/current/weather/radar/radar_met_ondergrond.gif';

export interface RadarResponse {
  /** PNG URL on our own backend that the browser can <img src=…>. */
  imageUrl: string;
  /** Same image but on an animated GIF if WMS is unavailable. */
  animationUrl: string;
  /** Whether real WMS (vs static fallback) is in use. */
  source: 'wms' | 'fallback';
  fetchedAt: string;
}

/** Build a bbox around (lat, lon) for the given "zoom" (in degrees radius). */
function bboxAround(lat: number, lon: number, radiusDeg: number): [number, number, number, number] {
  return [lon - radiusDeg, lat - radiusDeg, lon + radiusDeg, lat + radiusDeg];
}

/** Construct a WMS GetMap URL for a centered tile. */
export function buildWmsUrl(lat: number, lon: number, opts: { zoom?: number; width?: number; height?: number } = {}): string {
  const radius = opts.zoom ?? 1.5; // ~1.5° ≈ 165 km radius, covers NL
  const [minX, minY, maxX, maxY] = bboxAround(lat, lon, radius);
  const params = new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetMap',
    layers: 'precipitation_intensity',
    styles: '',
    crs: 'EPSG:4326',
    bbox: `${minY},${minX},${maxY},${maxX}`, // WMS 1.3.0 lat,lon order for EPSG:4326
    width: String(opts.width ?? 600),
    height: String(opts.height ?? 600),
    format: 'image/png',
    transparent: 'true',
  });
  return `${WMS_BASE}?${params.toString()}`;
}

export interface RadarImage {
  body: Buffer | null;
  contentType: string;
  source: 'wms' | 'fallback';
  cacheable: boolean;
}

/** Fetch a radar PNG. Returns the body bytes for the route to send. */
export async function fetchRadarImage(
  lat: number,
  lon: number,
  zoom: number,
): Promise<RadarImage> {
  const cacheKey = `radar:img:${lat.toFixed(2)}:${lon.toFixed(2)}:${zoom}`;
  const cached = cache.get<RadarImage>(cacheKey);
  if (cached) return cached;

  if (!config.knmiWmsApiKey) {
    return { body: null, contentType: 'image/png', source: 'fallback', cacheable: false };
  }

  try {
    const url = buildWmsUrl(lat, lon, { zoom });
    const res = await fetch(url, { headers: { Authorization: config.knmiWmsApiKey } });
    if (!res.ok) {
      console.warn('KNMI WMS failed:', res.status, res.statusText);
      return { body: null, contentType: 'image/png', source: 'fallback', cacheable: false };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const result: RadarImage = {
      body: buf,
      contentType: res.headers.get('content-type') || 'image/png',
      source: 'wms',
      cacheable: true,
    };
    cache.set(cacheKey, result, config.cache.radarTtl);
    return result;
  } catch (err) {
    console.warn('KNMI WMS error:', err instanceof Error ? err.message : err);
    return { body: null, contentType: 'image/png', source: 'fallback', cacheable: false };
  }
}

export function getRadarUrls(lat?: number, lon?: number): RadarResponse {
  const useLat = lat ?? config.latitude;
  const useLon = lon ?? config.longitude;
  const cacheKey = `radar:meta:${useLat.toFixed(2)}:${useLon.toFixed(2)}`;
  const cached = cache.get<RadarResponse>(cacheKey);
  if (cached) return cached;

  const hasWms = !!config.knmiWmsApiKey;
  const result: RadarResponse = hasWms
    ? {
        // Backend-proxied PNG that browsers cache via the cache-control header
        imageUrl: `/api/radar.png?lat=${useLat}&lon=${useLon}&zoom=1.5`,
        animationUrl: FALLBACK_IMAGE,
        source: 'wms',
        fetchedAt: new Date().toISOString(),
      }
    : {
        imageUrl: FALLBACK_IMAGE,
        animationUrl: FALLBACK_IMAGE,
        source: 'fallback',
        fetchedAt: new Date().toISOString(),
      };
  cache.set(cacheKey, result, config.cache.radarTtl);
  return result;
}
