interface ExternalLinksProps {
  latitude: number;
  longitude: number;
}

const LINKS = [
  {
    label: 'Windy.com',
    url: (lat: number, lon: number) =>
      `https://www.windy.com/${lat.toFixed(3)}/${lon.toFixed(3)}?${lat.toFixed(3)},${lon.toFixed(3)},12`,
    color: '#4285f4',
  },
  {
    label: 'Buienradar',
    url: (_lat: number, _lon: number) => 'https://www.buienradar.nl/',
    color: '#00a1e0',
  },
  {
    label: 'Regenmelding',
    url: (lat: number, lon: number) =>
      `https://regenmelding.nl/#lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`,
    color: '#6cb4ee',
  },
] as const;

export function ExternalLinks({ latitude, longitude }: ExternalLinksProps) {
  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-sm)',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          color: 'var(--color-text-tertiary)',
          fontSize: 'var(--text-sm)',
          marginRight: 'var(--space-xs)',
        }}
      >
        Meer weer:
      </span>
      {LINKS.map((link) => (
        <a
          key={link.label}
          href={link.url(latitude, longitude)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: 'var(--space-xs) var(--space-sm)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface-1)',
            color: link.color,
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            textDecoration: 'none',
            border: '1px solid var(--color-border)',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-surface-2)';
            e.currentTarget.style.borderColor = link.color;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-surface-1)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          {link.label}
          <span style={{ fontSize: 'var(--text-xs)', opacity: 0.6 }}>↗</span>
        </a>
      ))}
    </div>
  );
}
