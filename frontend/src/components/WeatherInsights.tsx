import type {
  MultiModelForecast,
  CurrentWeatherResponse,
  StookwijzerResponse,
  WarningsResponse,
} from '../types/weather';
import { generateInsights, type WeatherInsight } from '../utils/insights';

interface WeatherInsightsProps {
  forecast: MultiModelForecast | null;
  currentWeather: CurrentWeatherResponse | null;
  stookwijzer: StookwijzerResponse | null;
  warnings: WarningsResponse | null;
}

export function WeatherInsights({ forecast, currentWeather, stookwijzer, warnings }: WeatherInsightsProps) {
  const insights = generateInsights({ forecast, currentWeather, stookwijzer, warnings });

  if (insights.length === 0) return null;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      {insights.map((insight, i) => (
        <InsightRow key={i} insight={insight} isHero={i === 0 && insight.type === 'current'} />
      ))}
    </div>
  );
}

function InsightRow({ insight, isHero }: { insight: WeatherInsight; isHero: boolean }) {
  const isWarning = insight.type === 'warning';

  return (
    <div
      style={{
        ...(isWarning
          ? {
              background: 'rgba(245, 158, 11, 0.06)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-sm) var(--space-md)',
              margin: '0 calc(-1 * var(--space-sm))',
            }
          : {}),
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--space-sm)',
        }}
      >
        <span style={{ flexShrink: 0, fontSize: isHero ? 'var(--text-lg)' : 'var(--text-base)' }}>
          {insight.icon}
        </span>
        <span
          className={isHero ? 'insight-hero' : isWarning ? 'insight-warning' : 'insight-line'}
        >
          {insight.text}
        </span>
      </div>
      {insight.subtext && (
        <div className="insight-meta" style={{ paddingLeft: 'calc(1em + var(--space-sm))' }}>
          {insight.subtext}
        </div>
      )}
    </div>
  );
}
