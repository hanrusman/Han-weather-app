import { useState, useEffect, useCallback } from 'react';

interface RadarMapProps {
  latitude: number;
  longitude: number;
}

const RADAR_URL = 'https://image.buienradar.nl/2.0/image/animation/RadarMapRainNL';
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function RadarMap({ latitude: _lat, longitude: _lon }: RadarMapProps) {
  const [cacheBust, setCacheBust] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setCacheBust(Date.now()), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = useCallback(() => setCacheBust(Date.now()), []);

  const src = `${RADAR_URL}?height=550&width=550&renderBackground=True&renderBranding=False&renderText=True&History=2&Forecast=6&_t=${cacheBust}`;

  return (
    <div className="card-flush" style={{ overflow: 'hidden' }}>
      <div
        className="flex items-center justify-between"
        style={{ padding: 'var(--space-lg)', paddingBottom: 'var(--space-md)' }}
      >
        <h2 className="section-title">Regenradar</h2>
        <button
          onClick={handleRefresh}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-tertiary)',
            fontSize: 'var(--text-sm)',
            padding: 'var(--space-xs)',
            transition: 'color var(--transition-fast)',
          }}
          title="Ververs radar"
        >
          ↻
        </button>
      </div>
      <div style={{ aspectRatio: '1', background: 'var(--color-surface-0)' }}>
        <img
          src={src}
          alt="Buienradar regenradar Nederland"
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </div>
      <div style={{ padding: 'var(--space-sm) var(--space-lg)', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>
        Bron: Buienradar / KNMI
      </div>
    </div>
  );
}
