import type { CurrentWeatherResponse, ModelId } from '../types/weather';
import { MODEL_LABELS } from '../utils/colors';
import { formatTempFull, formatWindFull, formatHumidity, formatPressure, averageValues } from '../utils/formatting';
import { getWeatherInfo } from '../utils/weatherCodes';

interface CurrentWeatherProps {
  data: CurrentWeatherResponse;
  locationName: string;
}

export function CurrentWeather({ data, locationName }: CurrentWeatherProps) {
  const modelEntries = Object.entries(data.models);
  if (modelEntries.length === 0) return null;

  const temps = modelEntries.map(([, m]) => m.temperature);
  const winds = modelEntries.map(([, m]) => m.windSpeed);
  const humidities = modelEntries.map(([, m]) => m.humidity);
  const pressures = modelEntries.map(([, m]) => m.pressure).filter((p) => p > 0);
  const feelsLike = modelEntries.map(([, m]) => m.apparentTemperature);

  const primaryModel = data.models.knmi_seamless || modelEntries[0][1];
  const weatherInfo = getWeatherInfo(primaryModel.weatherCode);
  const avgTemp = averageValues(temps);
  const avgFeels = averageValues(feelsLike);

  return (
    <div className="card">
      {/* Hero — glanceable in 1 second */}
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{locationName}</p>
          <div className="flex items-end" style={{ gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
            <span style={{ fontSize: 'var(--text-4xl)', fontWeight: 200, letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--color-text-bright)' }}>
              {Math.round(avgTemp)}°
            </span>
            <span style={{ fontSize: '2rem', lineHeight: 1, marginBottom: '4px' }}>{weatherInfo.icon}</span>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-base)', marginTop: 'var(--space-xs)' }}>
            {weatherInfo.description}
          </p>
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)', marginTop: '2px' }}>
            Voelt als {formatTempFull(avgFeels)}
          </p>
        </div>

        <div className="text-right flex flex-col" style={{ gap: 'var(--space-md)' }}>
          <div>
            <p className="stat-label">Wind</p>
            <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
              {formatWindFull(averageValues(winds))}
            </p>
          </div>
          <div>
            <p className="stat-label">Vochtigheid</p>
            <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
              {formatHumidity(averageValues(humidities))}
            </p>
          </div>
          {pressures.length > 0 && (
            <div>
              <p className="stat-label">Luchtdruk</p>
              <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                {formatPressure(averageValues(pressures))}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Per-model breakdown */}
      <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--color-border)' }}>
        <div className="grid grid-cols-5" style={{ gap: 'var(--space-sm)' }}>
          {modelEntries.map(([modelId, m]) => (
            <div key={modelId} className="text-center">
              <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {MODEL_LABELS[modelId as ModelId]?.split(' ').pop()}
              </p>
              <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 600, marginTop: '2px' }}>
                {formatTempFull(m.temperature)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
