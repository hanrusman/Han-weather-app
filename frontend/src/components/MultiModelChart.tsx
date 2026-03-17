import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
} from 'recharts';
import type { ModelId, MultiModelForecast, WeatherVariable, TimeRange, ChartDataPoint } from '../types/weather';
import { MODEL_COLORS, MODEL_LABELS } from '../utils/colors';
import { formatTemp, formatWind } from '../utils/formatting';
import { ModelLegend } from './ModelLegend';

interface MultiModelChartProps {
  forecast: MultiModelForecast;
  enabledModels: Set<ModelId>;
  allModels: ModelId[];
  isEnabled: (model: ModelId) => boolean;
  onToggle: (model: ModelId) => void;
}

const VARIABLE_CONFIG: Record<WeatherVariable, {
  label: string;
  unit: string;
  dataKey: string;
  format: (v: number) => string;
  chartType: 'line' | 'bar';
}> = {
  temperature: { label: 'Temperatuur', unit: '°C', dataKey: 'temperature_2m', format: formatTemp, chartType: 'line' },
  feelsLike: { label: 'Gevoelstemp.', unit: '°C', dataKey: 'apparent_temperature', format: formatTemp, chartType: 'line' },
  precipitation: { label: 'Neerslagkans', unit: '%', dataKey: 'precipitation_probability', format: (v) => `${Math.round(v)}%`, chartType: 'bar' },
  wind: { label: 'Wind', unit: 'bft', dataKey: 'wind_speed_10m', format: formatWind, chartType: 'line' },
};

const TIME_RANGES: { key: TimeRange; label: string; hours: number }[] = [
  { key: '1d', label: '24u', hours: 24 },
  { key: '3d', label: '3d', hours: 72 },
  { key: '7d', label: '7d', hours: 168 },
  { key: '14d', label: '14d', hours: 336 },
];

function formatXTick(time: string, range: TimeRange): string {
  const date = new Date(time);
  if (range === '1d') {
    return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  }
  const hour = date.getHours();
  if (range === '14d') {
    return hour === 0 ? date.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric' }) : '';
  }
  if (hour === 0 || hour === 12) {
    if (hour === 0) {
      return date.toLocaleDateString('nl-NL', { weekday: 'short' });
    }
    return '12:00';
  }
  return '';
}

export function MultiModelChart({ forecast, enabledModels, allModels, isEnabled, onToggle }: MultiModelChartProps) {
  const [variable, setVariable] = useState<WeatherVariable>('temperature');
  const [timeRange, setTimeRange] = useState<TimeRange>('3d');

  const varConfig = VARIABLE_CONFIG[variable];
  const rangeConfig = TIME_RANGES.find((r) => r.key === timeRange)!;

  const chartData = useMemo(() => {
    const models = Object.entries(forecast.models);
    if (models.length === 0) return [];

    const [, firstModel] = models[0];
    const times = firstModel.time.slice(0, rangeConfig.hours);
    const step = timeRange === '14d' ? 6 : timeRange === '7d' ? 3 : 1;

    const data: ChartDataPoint[] = [];
    for (let i = 0; i < times.length; i += step) {
      const time = times[i];
      const point: ChartDataPoint = { time };
      const values: number[] = [];

      for (const [modelId, hourly] of models) {
        const dataArray = hourly[varConfig.dataKey as keyof typeof hourly] as number[] | undefined;
        if (dataArray && dataArray[i] !== undefined) {
          point[modelId] = dataArray[i];
          if (enabledModels.has(modelId as ModelId)) {
            values.push(dataArray[i]);
          }
        }
      }

      if (values.length > 0) {
        point._avg = values.reduce((s, v) => s + v, 0) / values.length;
      }

      data.push(point);
    }
    return data;
  }, [forecast, variable, timeRange, enabledModels, rangeConfig.hours, varConfig.dataKey]);

  const tickInterval = timeRange === '1d' ? 2 : timeRange === '3d' ? 5 : 1; // 7d and 14d use 1

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload || !label) return null;
    const date = new Date(label);
    const timeStr = date.toLocaleString('nl-NL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border-emphasis)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-sm)' }}>{timeStr}</p>
        {payload
          .filter((p) => !p.dataKey.startsWith('_'))
          .map((entry) => (
            <div key={entry.dataKey} className="flex items-center" style={{ gap: 'var(--space-sm)', fontSize: 'var(--text-sm)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {MODEL_LABELS[entry.dataKey as ModelId] || entry.dataKey}
              </span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-bright)', marginLeft: 'auto' }}>
                {varConfig.format(entry.value)}
              </span>
            </div>
          ))}
      </div>
    );
  };

  const yDomain = variable === 'precipitation' ? [0, 100] : undefined;

  // Chart grid/axis colors from design tokens
  const gridColor = 'rgba(255,255,255,0.04)';
  const axisColor = 'rgba(255,255,255,0.08)';
  const tickColor = 'rgba(255,255,255,0.32)';

  return (
    <div className="card">
      {/* Header with tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between" style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
          <h2 className="section-title">{varConfig.label}</h2>
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>({varConfig.unit})</span>
        </div>

        <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
          {/* Variable tabs */}
          <div className="tab-group">
            {(Object.keys(VARIABLE_CONFIG) as WeatherVariable[]).map((v) => (
              <button
                key={v}
                onClick={() => setVariable(v)}
                className={`tab ${variable === v ? 'tab-active' : ''}`}
              >
                {VARIABLE_CONFIG[v].label}
              </button>
            ))}
          </div>

          {/* Time range tabs */}
          <div className="tab-group">
            {TIME_RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setTimeRange(r.key)}
                className={`tab ${timeRange === r.key ? 'tab-active' : ''}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <ModelLegend allModels={allModels} isEnabled={isEnabled} onToggle={onToggle} />
      </div>

      {/* Chart */}
      <div className="h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          {varConfig.chartType === 'bar' ? (
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="time"
                tickFormatter={(t) => formatXTick(t, timeRange)}
                interval={tickInterval}
                stroke={axisColor}
                tick={{ fontSize: 11, fill: tickColor }}
                tickLine={false}
              />
              <YAxis
                stroke={axisColor}
                tick={{ fontSize: 11, fill: tickColor }}
                tickFormatter={(v) => varConfig.format(v)}
                domain={yDomain}
              />
              <Tooltip content={<CustomTooltip />} />
              {allModels.filter((m) => enabledModels.has(m)).map((model) => (
                <Bar
                  key={model}
                  dataKey={model}
                  fill={MODEL_COLORS[model]}
                  opacity={0.75}
                  barSize={timeRange === '14d' ? 2 : timeRange === '7d' ? 3 : timeRange === '3d' ? 4 : 8}
                />
              ))}
            </ComposedChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="time"
                tickFormatter={(t) => formatXTick(t, timeRange)}
                interval={tickInterval}
                stroke={axisColor}
                tick={{ fontSize: 11, fill: tickColor }}
                tickLine={false}
              />
              <YAxis
                stroke={axisColor}
                tick={{ fontSize: 11, fill: tickColor }}
                tickFormatter={(v) => varConfig.format(v)}
              />
              <Tooltip content={<CustomTooltip />} />
              {allModels.filter((m) => enabledModels.has(m)).map((model) => (
                <Line
                  key={model}
                  type="monotone"
                  dataKey={model}
                  stroke={MODEL_COLORS[model]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
              <Line
                type="monotone"
                dataKey="_avg"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
                activeDot={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
