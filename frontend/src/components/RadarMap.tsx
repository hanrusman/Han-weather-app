interface RadarMapProps {
  latitude: number;
  longitude: number;
}

export function RadarMap({ latitude, longitude }: RadarMapProps) {
  const iframeSrc = `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${latitude.toFixed(4)}&lng=${longitude.toFixed(4)}&ovession=2&zoom=8&size=2&voor=1`;

  return (
    <div className="card-flush" style={{ overflow: 'hidden' }}>
      <div style={{ padding: 'var(--space-lg)', paddingBottom: 'var(--space-md)' }}>
        <h2 className="section-title">Regenradar</h2>
      </div>
      <div style={{ aspectRatio: '1', background: 'var(--color-surface-0)' }}>
        <iframe
          key={`${latitude}-${longitude}`}
          src={iframeSrc}
          width="100%"
          height="100%"
          style={{ border: 'none', display: 'block' }}
          title="Buienradar regenradar"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
      <div style={{ padding: 'var(--space-sm) var(--space-lg)', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>
        Bron: Buienradar / KNMI
      </div>
    </div>
  );
}
