import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

interface RadarMapProps {
  latitude: number;
  longitude: number;
}

const WMS_BASE = 'https://anonymous.api.dataplatform.knmi.nl/wms/adaguc-server';
const DATASET = 'radar_forecast_2.0';
const LAYER = 'precipitation_nowcast';
const STYLE = 'rainrate-blue-to-purple/shaded';

/**
 * Zoom levels expressed as half-extents around the user's lat/lon.
 * At NL latitude (52°), 1° lat ≈ 111 km and 1° lon ≈ 68 km.
 */
const ZOOM_LEVELS: { halfLat: number; halfLon: number; label: string }[] = [
  { halfLat: 0.30, halfLon: 0.50, label: 'stad' },     // ~33 × 34 km
  { halfLat: 0.70, halfLon: 1.00, label: 'regio' },    // ~78 × 68 km
  { halfLat: 1.20, halfLon: 1.80, label: 'gebied' },   // ~133 × 123 km
  { halfLat: 2.00, halfLon: 3.00, label: 'land' },     // ~222 × 204 km — full NL
];
const DEFAULT_ZOOM = 1; // "regio" — tighter than full NL by default
const ZOOM_STORAGE_KEY = 'nl-weather-radar-zoom';

const HISTORY_MIN = 30;   // past frames
const FORECAST_MIN = 90;  // forecast frames
const STEP_MIN = 5;
const FRAME_MS = 250;     // playback speed
const REFRESH_INTERVAL = 5 * 60 * 1000;

function readStoredZoom(): number {
  if (typeof window === 'undefined') return DEFAULT_ZOOM;
  const raw = window.localStorage.getItem(ZOOM_STORAGE_KEY);
  if (raw == null) return DEFAULT_ZOOM;
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed >= ZOOM_LEVELS.length) return DEFAULT_ZOOM;
  return parsed;
}

/** Floor a Date to the nearest 5-minute boundary in UTC. */
function floorToFiveMin(d: Date): Date {
  const out = new Date(d);
  out.setUTCSeconds(0, 0);
  out.setUTCMinutes(Math.floor(out.getUTCMinutes() / STEP_MIN) * STEP_MIN);
  return out;
}

/** Build the radar WMS GetMap URL for a single frame. */
function buildFrameUrl(opts: {
  bbox: [number, number, number, number]; // [minLat, minLon, maxLat, maxLon]
  width: number;
  height: number;
  time: string; // ISO 8601, e.g. 2026-06-03T20:35:00Z
}): string {
  const [minLat, minLon, maxLat, maxLon] = opts.bbox;
  const qs = new URLSearchParams({
    DATASET,
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetMap',
    LAYERS: LAYER,
    STYLES: STYLE,
    CRS: 'EPSG:4326',
    BBOX: `${minLat},${minLon},${maxLat},${maxLon}`, // WMS 1.3.0: lat,lon for EPSG:4326
    WIDTH: String(opts.width),
    HEIGHT: String(opts.height),
    FORMAT: 'image/png',
    TRANSPARENT: 'true',
    TIME: opts.time,
  });
  return `${WMS_BASE}?${qs.toString()}`;
}

/** Build a basemap URL aligned to the same bbox as the radar overlay. */
function buildBasemapUrl(bbox: [number, number, number, number], width: number, height: number): string {
  const [minLat, minLon, maxLat, maxLon] = bbox;
  const qs = new URLSearchParams({
    service: 'WMS',
    version: '1.1.1',
    request: 'GetMap',
    layers: 'OSM-WMS',
    styles: '',
    srs: 'EPSG:4326',
    bbox: `${minLon},${minLat},${maxLon},${maxLat}`, // WMS 1.1.1: lon,lat order
    width: String(width),
    height: String(height),
    format: 'image/png',
  });
  return `https://ows.terrestris.de/osm/service?${qs.toString()}`;
}

interface RadarFrame {
  time: Date;
  url: string;
  isForecast: boolean;
}

export default function RadarMap({ latitude, longitude }: RadarMapProps) {
  const [now, setNow] = useState(() => floorToFiveMin(new Date()));
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [zoomIdx, setZoomIdx] = useState<number>(() => readStoredZoom());
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist zoom across reloads
  useEffect(() => {
    try { window.localStorage.setItem(ZOOM_STORAGE_KEY, String(zoomIdx)); } catch { /* ignore */ }
  }, [zoomIdx]);

  const zoom = ZOOM_LEVELS[zoomIdx];
  const bbox = useMemo<[number, number, number, number]>(
    () => [latitude - zoom.halfLat, longitude - zoom.halfLon, latitude + zoom.halfLat, longitude + zoom.halfLon],
    [latitude, longitude, zoom.halfLat, zoom.halfLon],
  );
  const basemapUrl = useMemo(() => buildBasemapUrl(bbox, 600, 600), [bbox]);

  const frames = useMemo<RadarFrame[]>(() => {
    const startMs = now.getTime() - HISTORY_MIN * 60_000;
    const endMs = now.getTime() + FORECAST_MIN * 60_000;
    const result: RadarFrame[] = [];
    for (let ts = startMs; ts <= endMs; ts += STEP_MIN * 60_000) {
      const time = new Date(ts);
      result.push({
        time,
        url: buildFrameUrl({ bbox, width: 600, height: 600, time: time.toISOString().replace(/\.\d+/, '') }),
        isForecast: ts > now.getTime(),
      });
    }
    return result;
  }, [now, bbox]);

  // "Now" is the index of the first forecast frame (i.e. HISTORY_MIN / STEP_MIN)
  const nowIndex = HISTORY_MIN / STEP_MIN;

  // Reset playback to "now" whenever we recompute frames (i.e. on the 5-min tick)
  useEffect(() => {
    setFrameIdx(0);
    setHasError(false);
  }, [frames]);

  // Refresh window every 5 min so a fresh nowcast slides in
  useEffect(() => {
    const tick = setInterval(() => setNow(floorToFiveMin(new Date())), REFRESH_INTERVAL);
    return () => clearInterval(tick);
  }, []);

  // Playback loop
  useEffect(() => {
    if (!playing) {
      if (frameTimerRef.current) clearInterval(frameTimerRef.current);
      return;
    }
    frameTimerRef.current = setInterval(() => {
      setFrameIdx((i) => (i + 1) % frames.length);
    }, FRAME_MS);
    return () => {
      if (frameTimerRef.current) clearInterval(frameTimerRef.current);
    };
  }, [playing, frames.length]);

  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFrameIdx(parseInt(e.target.value, 10));
    setPlaying(false);
  }, []);

  const handleTogglePlay = useCallback(() => setPlaying((p) => !p), []);

  const handleJumpNow = useCallback(() => {
    setFrameIdx(nowIndex);
    setPlaying(false);
  }, [nowIndex]);

  const handleZoomIn = useCallback(
    () => setZoomIdx((z) => Math.max(0, z - 1)),
    [],
  );
  const handleZoomOut = useCallback(
    () => setZoomIdx((z) => Math.min(ZOOM_LEVELS.length - 1, z + 1)),
    [],
  );

  const current = frames[frameIdx];
  if (!current) return null;

  const timeLabel = current.time.toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const offsetMin = Math.round((current.time.getTime() - now.getTime()) / 60_000);
  const offsetLabel =
    offsetMin === 0 ? 'nu' :
    offsetMin > 0 ? `+${offsetMin} min` :
    `${offsetMin} min`;

  return (
    <div className="card-flush" style={{ overflow: 'hidden' }}>
      <div
        className="flex items-center justify-between"
        style={{ padding: 'var(--space-lg)', paddingBottom: 'var(--space-md)' }}
      >
        <div>
          <h2 className="section-title">Regenradar</h2>
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)', marginTop: 2 }}>
            {timeLabel} · {offsetLabel}
          </p>
        </div>
        <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
          <div
            className="flex items-center"
            role="group"
            aria-label="Zoom"
            style={{
              background: 'var(--color-surface-0)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={handleZoomIn}
              disabled={zoomIdx === 0}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: zoomIdx === 0 ? 'default' : 'pointer',
                color: zoomIdx === 0 ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
                fontSize: 'var(--text-sm)',
                padding: '4px 10px',
                lineHeight: 1,
              }}
              title="Inzoomen"
              aria-label="Inzoomen"
            >
              +
            </button>
            <span
              aria-hidden="true"
              style={{
                color: 'var(--color-text-tertiary)',
                fontSize: 'var(--text-xs)',
                padding: '0 6px',
                minWidth: 40,
                textAlign: 'center',
              }}
            >
              {zoom.label}
            </span>
            <button
              onClick={handleZoomOut}
              disabled={zoomIdx === ZOOM_LEVELS.length - 1}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: zoomIdx === ZOOM_LEVELS.length - 1 ? 'default' : 'pointer',
                color: zoomIdx === ZOOM_LEVELS.length - 1 ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
                fontSize: 'var(--text-sm)',
                padding: '4px 10px',
                lineHeight: 1,
              }}
              title="Uitzoomen"
              aria-label="Uitzoomen"
            >
              −
            </button>
          </div>
          <button
            onClick={handleTogglePlay}
            style={{
              background: 'var(--color-surface-0)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-sm)',
              padding: '4px 10px',
              transition: 'all var(--transition-fast)',
            }}
            title={playing ? 'Pauze' : 'Afspelen'}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <button
            onClick={handleJumpNow}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-sm)',
              padding: '4px 10px',
              transition: 'all var(--transition-fast)',
            }}
            title="Spring naar nu"
          >
            nu
          </button>
        </div>
      </div>
      <div
        style={{
          aspectRatio: '1',
          background: 'var(--color-surface-0)',
          position: 'relative',
        }}
      >
        {/* Preload every radar frame so playback is smooth */}
        <div style={{ display: 'none' }}>
          {frames.map((f) => (
            <img key={f.url} src={f.url} alt="" loading="eager" decoding="async" />
          ))}
        </div>
        {hasError ? (
          <FallbackBuienradar />
        ) : (
          <>
            {/* Basemap — aligned to the same bbox */}
            <img
              src={basemapUrl}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: 0.85,
              }}
            />
            {/* Radar overlay */}
            <img
              src={current.url}
              alt={`KNMI radar ${timeLabel}`}
              loading="lazy"
              decoding="async"
              onError={() => setHasError(true)}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                mixBlendMode: 'multiply',
              }}
            />
          </>
        )}
        {current.isForecast && !hasError && (
          <div
            style={{
              position: 'absolute',
              top: 'var(--space-sm)',
              left: 'var(--space-sm)',
              background: 'rgba(0,0,0,0.55)',
              color: 'white',
              fontSize: 'var(--text-xs)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            voorspelling
          </div>
        )}
      </div>
      {/* Scrubber */}
      <div style={{ padding: 'var(--space-sm) var(--space-lg)' }}>
        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={frameIdx}
          onChange={handleScrub}
          aria-label="Selecteer radarframe"
          style={{
            width: '100%',
            accentColor: 'var(--color-accent)',
          }}
        />
      </div>
      <div style={{ padding: '0 var(--space-lg) var(--space-md)', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>
        Bron: KNMI radar nowcast{hasError ? ' (offline — Buienradar fallback)' : ''}
      </div>
    </div>
  );
}

function FallbackBuienradar() {
  const src = `https://image.buienradar.nl/2.0/image/animation/RadarMapRainNL?height=550&width=550&renderBackground=True&renderBranding=False&renderText=True&History=2&Forecast=6&_t=${Math.floor(Date.now() / 60000)}`;
  return (
    <img
      src={src}
      alt="Buienradar regenradar fallback"
      loading="lazy"
      decoding="async"
      style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
    />
  );
}
