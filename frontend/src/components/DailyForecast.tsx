import type { MultiModelForecast, ModelId } from '../types/weather';
import { getWeatherInfo } from '../utils/weatherCodes';
import { formatTemp, formatPrecip } from '../utils/formatting';

interface DailyForecastProps {
  forecast: MultiModelForecast;
  enabledModels: Set<ModelId>;
}

interface DayData {
  date: string;
  dayLabel: string;
  minTemp: number;
  maxTemp: number;
  spreadMin: number;
  spreadMax: number;
  totalPrecip: number;
  weatherCode: number;
}

export function DailyForecast({ forecast, enabledModels }: DailyForecastProps) {
  const models = Object.entries(forecast.models).filter(([id]) =>
    enabledModels.has(id as ModelId)
  );
  if (models.length === 0) return null;

  const [, firstModel] = models[0];
  const dayMap = new Map<string, DayData>();

  firstModel.time.forEach((time, i) => {
    const date = time.slice(0, 10);
    if (!dayMap.has(date)) {
      const d = new Date(time);
      dayMap.set(date, {
        date,
        dayLabel: d.toLocaleDateString('nl-NL', { weekday: 'short' }),
        minTemp: Infinity,
        maxTemp: -Infinity,
        spreadMin: Infinity,
        spreadMax: -Infinity,
        totalPrecip: 0,
        weatherCode: 0,
      });
    }

    const day = dayMap.get(date)!;
    const allTemps: number[] = [];
    let maxPrecip = 0;

    for (const [, hourly] of models) {
      if (hourly.temperature_2m[i] !== undefined) {
        allTemps.push(hourly.temperature_2m[i]);
      }
      if (hourly.precipitation[i] !== undefined) {
        maxPrecip = Math.max(maxPrecip, hourly.precipitation[i]);
      }
    }

    if (allTemps.length > 0) {
      const avg = allTemps.reduce((s, v) => s + v, 0) / allTemps.length;
      day.minTemp = Math.min(day.minTemp, avg);
      day.maxTemp = Math.max(day.maxTemp, avg);
      day.spreadMin = Math.min(day.spreadMin, ...allTemps);
      day.spreadMax = Math.max(day.spreadMax, ...allTemps);
    }

    day.totalPrecip += maxPrecip;

    const hour = new Date(time).getHours();
    if (hour === 12) {
      const codes = models.map(([, h]) => h.weather_code[i]).filter((c) => c !== undefined);
      if (codes.length > 0) {
        day.weatherCode = codes.sort((a, b) => b - a)[0];
      }
    }
  });

  const days = Array.from(dayMap.values()).slice(0, 7);
  const globalMin = Math.min(...days.map((d) => d.spreadMin));
  const globalMax = Math.max(...days.map((d) => d.spreadMax));
  const tempRange = globalMax - globalMin || 1;

  return (
    <div className="card">
      <h2 className="section-title" style={{ marginBottom: 'var(--space-lg)' }}>7-daagse voorspelling</h2>
      <div className="flex flex-col" style={{ gap: 'var(--space-sm)' }}>
        {days.map((day) => {
          const weather = getWeatherInfo(day.weatherCode);
          const leftPct = ((day.spreadMin - globalMin) / tempRange) * 100;
          const widthPct = ((day.spreadMax - day.spreadMin) / tempRange) * 100;
          const avgLeftPct = ((day.minTemp - globalMin) / tempRange) * 100;
          const avgWidthPct = ((day.maxTemp - day.minTemp) / tempRange) * 100;

          return (
            <div
              key={day.date}
              className="flex items-center"
              style={{
                gap: 'var(--space-sm)',
                padding: 'var(--space-sm) 0',
                fontSize: 'var(--text-sm)',
              }}
            >
              <span style={{ width: 32, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', flexShrink: 0 }}>
                {day.dayLabel}
              </span>
              <span style={{ width: 24, textAlign: 'center', flexShrink: 0 }}>{weather.icon}</span>
              <span style={{ width: 36, textAlign: 'right', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
                {formatTemp(day.spreadMin)}
              </span>
              <div className="flex-1 relative mx-1" style={{ height: 6, background: 'var(--color-surface-0)', borderRadius: 3 }}>
                {/* Model spread */}
                <div
                  className="absolute"
                  style={{
                    left: `${leftPct}%`,
                    width: `${Math.max(widthPct, 2)}%`,
                    height: '100%',
                    borderRadius: 3,
                    background: 'var(--color-surface-2)',
                  }}
                />
                {/* Average range — gradient accent */}
                <div
                  className="absolute"
                  style={{
                    left: `${avgLeftPct}%`,
                    width: `${Math.max(avgWidthPct, 2)}%`,
                    height: '100%',
                    borderRadius: 3,
                    background: 'linear-gradient(to right, #3b82f6, #f97316)',
                  }}
                />
              </div>
              <span style={{ width: 36, color: 'var(--color-text-bright)', fontWeight: 500, flexShrink: 0 }}>
                {formatTemp(day.spreadMax)}
              </span>
              <span style={{ width: 48, textAlign: 'right', color: day.totalPrecip > 0.1 ? '#60a5fa' : 'transparent', fontSize: 'var(--text-xs)', flexShrink: 0 }}>
                {day.totalPrecip > 0.1 ? formatPrecip(day.totalPrecip) : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
