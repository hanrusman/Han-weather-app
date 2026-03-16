import type { WarningsResponse } from '../types/weather';
import { WARNING_COLORS } from '../utils/colors';

interface WarningsProps {
  data: WarningsResponse;
}

export function Warnings({ data }: WarningsProps) {
  if (data.warnings.length === 0) return null;

  return (
    <div className="card">
      <h2 className="section-title" style={{ marginBottom: 'var(--space-md)' }}>KNMI Waarschuwingen</h2>
      <div className="flex flex-col" style={{ gap: 'var(--space-sm)' }}>
        {data.warnings.map((warning, i) => (
          <div
            key={i}
            className="flex items-start"
            style={{
              gap: 'var(--space-md)',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: `${WARNING_COLORS[warning.level]}08`,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                marginTop: 3,
                flexShrink: 0,
                backgroundColor: WARNING_COLORS[warning.level],
              }}
            />
            <div>
              <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                {warning.area}
              </p>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', marginTop: '2px' }}>
                {warning.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
