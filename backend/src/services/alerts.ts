import { config } from '../config';
import { fetchWarnings } from './knmi';
import { fetchStookwijzer } from './stookwijzer';
import { fetchCurrentWeather } from './openmeteo';

interface AlertPayload {
  type: 'knmi_warning' | 'stookwijzer_change' | 'weather_change';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  data?: Record<string, unknown>;
}

// State tracking for change detection
let previousWarningCount = 0;
let previousStookwijzerAdvice: string | null = null;
let previousWeatherCode: number | null = null;

async function sendWebhook(payload: AlertPayload): Promise<void> {
  if (!config.haWebhookUrl) return;

  try {
    const res = await fetch(config.haWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`HA webhook failed: ${res.status}`);
    } else {
      console.log(`HA alert sent: ${payload.type} - ${payload.title}`);
    }
  } catch (err) {
    console.error('HA webhook error:', err);
  }
}

const SEVERITY_MAP: Record<string, AlertPayload['severity']> = {
  green: 'info',
  yellow: 'warning',
  orange: 'warning',
  red: 'critical',
};

// Significant weather codes that warrant an alert
const SIGNIFICANT_CODES = new Set([
  55, 56, 57, 65, 66, 67, 75, 77, 82, 86, 95, 96, 99,
]);

export async function checkAlerts(): Promise<void> {
  if (!config.haWebhookUrl) return;

  // 1. KNMI warnings
  try {
    const warnings = await fetchWarnings();
    const activeCount = warnings.warnings.length;

    if (activeCount > 0 && activeCount !== previousWarningCount) {
      const worst = warnings.warnings.reduce((prev, w) => {
        const levels = ['green', 'yellow', 'orange', 'red'];
        if (levels.indexOf(w.level) > levels.indexOf(prev.level)) return w;
        return prev;
      }, warnings.warnings[0]);

      await sendWebhook({
        type: 'knmi_warning',
        title: `KNMI Waarschuwing${activeCount > 1 ? ` (${activeCount})` : ''}`,
        message: `${worst.area}: ${worst.description}`,
        severity: SEVERITY_MAP[worst.level] || 'warning',
        data: { warningCount: activeCount },
      });
    }
    previousWarningCount = activeCount;
  } catch (err) {
    console.error('Alert check - warnings:', err);
  }

  // 2. Stookwijzer changes
  try {
    const stookwijzer = await fetchStookwijzer();

    if (previousStookwijzerAdvice !== null && stookwijzer.advice !== previousStookwijzerAdvice) {
      await sendWebhook({
        type: 'stookwijzer_change',
        title: 'Stookwijzer update',
        message: stookwijzer.label,
        severity: stookwijzer.advice === 'code_red' || stookwijzer.advice === 'code_orange' ? 'warning' : 'info',
        data: { advice: stookwijzer.advice, previous: previousStookwijzerAdvice },
      });
    }
    previousStookwijzerAdvice = stookwijzer.advice;
  } catch (err) {
    console.error('Alert check - stookwijzer:', err);
  }

  // 3. Significant weather changes
  try {
    const current = await fetchCurrentWeather();
    const primary = current.models.knmi_seamless || Object.values(current.models)[0];

    if (primary) {
      const code = primary.weatherCode;
      if (previousWeatherCode !== null && code !== previousWeatherCode && SIGNIFICANT_CODES.has(code)) {
        await sendWebhook({
          type: 'weather_change',
          title: 'Weersverandering',
          message: `Weercode ${code} — ${primary.temperature.toFixed(1)}°C, ${primary.windSpeed.toFixed(0)} km/u`,
          severity: code >= 95 ? 'critical' : 'warning',
          data: { weatherCode: code, temperature: primary.temperature },
        });
      }
      previousWeatherCode = code;
    }
  } catch (err) {
    console.error('Alert check - weather:', err);
  }
}
