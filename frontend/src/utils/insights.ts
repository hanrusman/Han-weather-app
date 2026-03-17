import type {
  MultiModelForecast,
  CurrentWeatherResponse,
  StookwijzerResponse,
  WarningsResponse,
} from '../types/weather';
import { getWeatherInfo } from './weatherCodes';
import { kmhToBeaufort } from './formatting';

export interface WeatherInsight {
  icon: string;
  text: string;
  subtext?: string;
  type: 'warning' | 'current' | 'rain' | 'temperature' | 'wind' | 'stookwijzer' | 'outlook';
}

export interface InsightData {
  forecast: MultiModelForecast | null;
  currentWeather: CurrentWeatherResponse | null;
  stookwijzer: StookwijzerResponse | null;
  warnings: WarningsResponse | null;
}

const DUTCH_DAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

function getDutchDayName(date: Date, now: Date): string {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((targetStart.getTime() - todayStart.getTime()) / 86400000);
  if (diffDays === 0) return 'vandaag';
  if (diffDays === 1) return 'morgen';
  return DUTCH_DAYS[date.getDay()];
}

function findCurrentHourIndex(times: string[]): number {
  const now = Date.now();
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]).getTime() - now);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}

function getModelValues(forecast: MultiModelForecast, field: string, index: number): number[] {
  const values: number[] = [];
  for (const model of Object.values(forecast.models)) {
    const arr = (model as unknown as Record<string, unknown>)[field] as number[] | undefined;
    if (arr && index < arr.length && arr[index] != null) {
      values.push(arr[index]);
    }
  }
  return values;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function mode(values: number[]): number {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  let best = values[0];
  let bestCount = 0;
  for (const [val, count] of counts) {
    if (count > bestCount || (count === bestCount && val > best)) {
      best = val;
      bestCount = count;
    }
  }
  return best;
}

// ─── Consensus helpers ─────────────────────────────────────────

type ConsensusLevel = 'high' | 'moderate' | 'low';

function consensusLevel(values: number[], thresholdMod: number, thresholdLow: number): ConsensusLevel {
  if (values.length < 2) return 'high';
  const spread = Math.max(...values) - Math.min(...values);
  if (spread >= thresholdLow) return 'low';
  if (spread >= thresholdMod) return 'moderate';
  return 'high';
}

const CONSENSUS_LABELS: Record<ConsensusLevel, string> = {
  high: 'modellen eens',
  moderate: 'enige onenigheid',
  low: 'modellen oneens',
};

// Weather categories for grouping
type WeatherCategory = 'sunny' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'thunder';

function categorizeCode(code: number): WeatherCategory {
  if (code <= 1) return 'sunny';
  if (code <= 3) return 'cloudy';
  if (code <= 48) return 'fog';
  if (code <= 67 || (code >= 80 && code <= 82)) return 'rain';
  if (code <= 77 || (code >= 85 && code <= 86)) return 'snow';
  return 'thunder';
}

const CATEGORY_LABELS: Record<WeatherCategory, string> = {
  sunny: 'zon',
  cloudy: 'bewolkt',
  fog: 'mist',
  rain: 'regen',
  snow: 'sneeuw',
  thunder: 'onweer',
};

// ─── Insight generators ────────────────────────────────────────

function warningInsights(warnings: WarningsResponse | null): WeatherInsight[] {
  if (!warnings?.warnings.length) return [];
  const levelOrder = { red: 0, orange: 1, yellow: 2, green: 3 };
  const sorted = [...warnings.warnings].sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
  return sorted.map((w) => ({
    icon: w.level === 'red' ? '🔴' : w.level === 'orange' ? '🟠' : '⚠️',
    text: `KNMI: ${w.description}`,
    type: 'warning' as const,
  }));
}

function currentInsight(
  _forecast: MultiModelForecast | null,
  currentWeather: CurrentWeatherResponse | null
): WeatherInsight | null {
  if (!currentWeather) return null;

  const models = Object.values(currentWeather.models);
  if (models.length === 0) return null;

  const avgTemp = avg(models.map((m) => m.temperature));
  const avgFeels = avg(models.map((m) => m.apparentTemperature));
  const avgHumidity = avg(models.map((m) => m.humidity));
  const avgPressure = avg(models.map((m) => m.pressure));
  const avgWind = avg(models.map((m) => m.windSpeed));
  const dominantCode = mode(models.map((m) => m.weatherCode));
  const info = getWeatherInfo(dominantCode);

  let text = `Nu ${Math.round(avgTemp)}° en ${info.description.toLowerCase()}`;
  if (Math.abs(avgTemp - avgFeels) >= 2) {
    text += `, voelt als ${Math.round(avgFeels)}°`;
  }

  const bft = kmhToBeaufort(avgWind);
  const currentConsensus = consensusLevel(models.map((m) => m.temperature), 2, 4);
  const consensusNote = currentConsensus !== 'high' ? ` · ${CONSENSUS_LABELS[currentConsensus]}` : '';
  const subtext = `${bft} bft (${Math.round(avgWind)} km/u) · ${Math.round(avgHumidity)}% · ${Math.round(avgPressure)} hPa${consensusNote}`;

  return { icon: info.icon, text, subtext, type: 'current' };
}

function temperatureInsight(forecast: MultiModelForecast | null): WeatherInsight | null {
  if (!forecast) return null;

  const modelEntries = Object.values(forecast.models);
  if (modelEntries.length === 0) return null;

  const times = modelEntries[0].time;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  // Find today's max per model (daytime hours 06-21)
  const todayMaxPerModel: number[] = [];
  const tomorrowMaxPerModel: number[] = [];

  for (const model of modelEntries) {
    let todayMax = -Infinity;
    let tomorrowMax = -Infinity;
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      const hour = parseInt(t.substring(11, 13), 10);
      if (hour < 6 || hour > 21) continue;
      if (t.startsWith(todayStr)) {
        todayMax = Math.max(todayMax, model.temperature_2m[i]);
      } else if (t.startsWith(tomorrowStr)) {
        tomorrowMax = Math.max(tomorrowMax, model.temperature_2m[i]);
      }
    }
    if (todayMax > -Infinity) todayMaxPerModel.push(todayMax);
    if (tomorrowMax > -Infinity) tomorrowMaxPerModel.push(tomorrowMax);
  }

  if (todayMaxPerModel.length === 0) return null;

  const todayAvgMax = avg(todayMaxPerModel);
  let trend = '';

  if (tomorrowMaxPerModel.length > 0) {
    const tomorrowAvgMax = avg(tomorrowMaxPerModel);
    const diff = tomorrowAvgMax - todayAvgMax;
    if (diff >= 3) trend = 'morgen een stuk warmer';
    else if (diff >= 1.5) trend = 'morgen iets warmer';
    else if (diff <= -3) trend = 'morgen flink kouder';
    else if (diff <= -1.5) trend = 'morgen iets kouder';
    else trend = 'morgen vergelijkbaar';
  }

  let text = `Vandaag maximaal ${Math.round(todayAvgMax)}°`;
  if (trend) text += `, ${trend}`;

  // Show model spread and consensus
  const spread = Math.max(...todayMaxPerModel) - Math.min(...todayMaxPerModel);
  if (spread >= 2) {
    text += ` (modellen ${Math.round(Math.min(...todayMaxPerModel))}°–${Math.round(Math.max(...todayMaxPerModel))}°)`;
  }

  const tempConsensus = consensusLevel(todayMaxPerModel, 2, 4);
  const subtext = tempConsensus !== 'high'
    ? `${CONSENSUS_LABELS[tempConsensus]} over de maximumtemperatuur`
    : undefined;

  return { icon: '🌡️', text, subtext, type: 'temperature' };
}

function precipitationInsight(forecast: MultiModelForecast | null): WeatherInsight | null {
  if (!forecast) return null;

  const modelEntries = Object.values(forecast.models);
  if (modelEntries.length === 0) return null;

  const times = modelEntries[0].time;
  const currentIdx = findCurrentHourIndex(times);
  const lookAhead = Math.min(currentIdx + 48, times.length);

  // Compute model-average precip probability per hour
  const hourlyAvgProb: number[] = [];
  for (let i = currentIdx; i < lookAhead; i++) {
    const probs = getModelValues(forecast, 'precipitation_probability', i);
    hourlyAvgProb.push(probs.length > 0 ? avg(probs) : 0);
  }

  if (hourlyAvgProb.length === 0) return null;

  // Compute max model spread in first 12 hours for consensus
  let maxPrecipSpread = 0;
  for (let i = currentIdx; i < Math.min(currentIdx + 12, lookAhead); i++) {
    const probs = getModelValues(forecast, 'precipitation_probability', i);
    if (probs.length > 1) {
      maxPrecipSpread = Math.max(maxPrecipSpread, Math.max(...probs) - Math.min(...probs));
    }
  }
  const precipSubtext = maxPrecipSpread >= 40
    ? 'Modellen verdeeld over neerslagkans'
    : maxPrecipSpread >= 25
      ? 'Modellen redelijk eens over neerslag'
      : undefined;

  const THRESHOLD = 40;
  const isCurrentlyRainy = hourlyAvgProb[0] >= THRESHOLD;

  // Find first transition
  let transitionIdx = -1;
  for (let i = 1; i < hourlyAvgProb.length; i++) {
    const isRainy = hourlyAvgProb[i] >= THRESHOLD;
    if (isRainy !== isCurrentlyRainy) {
      transitionIdx = i;
      break;
    }
  }

  const now = new Date();

  if (!isCurrentlyRainy && transitionIdx === -1) {
    return { icon: '☀️', text: 'Geen neerslag verwacht de komende 48 uur', subtext: precipSubtext, type: 'rain' };
  }

  if (isCurrentlyRainy && transitionIdx === -1) {
    return { icon: '🌧️', text: 'Aanhoudende neerslag de komende dagen', subtext: precipSubtext, type: 'rain' };
  }

  const transitionTime = new Date(times[currentIdx + transitionIdx]);
  const transitionDay = getDutchDayName(transitionTime, now);
  const timeStr = transitionTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

  if (!isCurrentlyRainy) {
    // Currently dry, rain coming
    const transitionDate = new Date(transitionTime.getFullYear(), transitionTime.getMonth(), transitionTime.getDate());
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysDiff = Math.round((transitionDate.getTime() - todayDate.getTime()) / 86400000);

    if (daysDiff === 0) {
      return { icon: '🌧️', text: `Droog tot ${timeStr}, daarna kans op neerslag`, subtext: precipSubtext, type: 'rain' };
    } else if (daysDiff === 1) {
      return { icon: '🌧️', text: `Vandaag droog, morgen vanaf ${timeStr} kans op neerslag`, subtext: precipSubtext, type: 'rain' };
    } else {
      return { icon: '☀️', text: `Droog t/m ${transitionDay}`, subtext: precipSubtext, type: 'rain' };
    }
  } else {
    // Currently rainy, dry period coming
    return { icon: '🌧️', text: `Neerslag tot ${timeStr}, daarna droog`, subtext: precipSubtext, type: 'rain' };
  }
}

function windInsight(forecast: MultiModelForecast | null): WeatherInsight | null {
  if (!forecast) return null;

  const modelEntries = Object.values(forecast.models);
  if (modelEntries.length === 0) return null;

  const times = modelEntries[0].time;
  const currentIdx = findCurrentHourIndex(times);
  const lookAhead = Math.min(currentIdx + 24, times.length);

  let maxAvgWind = 0;
  const maxWindPerModel: number[] = [];
  for (const model of modelEntries) {
    let modelMax = 0;
    for (let i = currentIdx; i < lookAhead; i++) {
      if (model.wind_speed_10m[i] !== undefined) {
        modelMax = Math.max(modelMax, model.wind_speed_10m[i]);
      }
    }
    maxWindPerModel.push(modelMax);
  }
  for (let i = currentIdx; i < lookAhead; i++) {
    const winds = getModelValues(forecast, 'wind_speed_10m', i);
    if (winds.length > 0) {
      maxAvgWind = Math.max(maxAvgWind, avg(winds));
    }
  }

  const bft = kmhToBeaufort(maxAvgWind);
  if (bft < 5) return null;

  let label = 'Vrij krachtige wind';
  if (bft >= 7) label = 'Harde wind verwacht';
  else if (bft >= 6) label = 'Krachtige wind';

  const bftPerModel = maxWindPerModel.map(kmhToBeaufort);
  const windConsensus = consensusLevel(bftPerModel, 1, 2);
  const subtext = windConsensus !== 'high'
    ? `Windkracht ${Math.min(...bftPerModel)}–${Math.max(...bftPerModel)} bft (${CONSENSUS_LABELS[windConsensus]})`
    : undefined;

  return { icon: '💨', text: `${label} vandaag (${bft} bft)`, subtext, type: 'wind' };
}

function stookwijzerInsight(stookwijzer: StookwijzerResponse | null): WeatherInsight | null {
  if (!stookwijzer) return null;
  return { icon: '🔥', text: stookwijzer.label, type: 'stookwijzer' };
}

function outlookInsight(forecast: MultiModelForecast | null): WeatherInsight | null {
  if (!forecast) return null;

  const modelEntries = Object.values(forecast.models);
  if (modelEntries.length === 0) return null;

  const times = modelEntries[0].time;
  const now = new Date();

  // Get dominant weather at noon for next 7 days
  const dayCategories: { day: Date; category: WeatherCategory }[] = [];

  for (let d = 0; d < 7; d++) {
    const target = new Date(now);
    target.setDate(target.getDate() + d);
    const targetStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    const noonStr = `${targetStr}T12:00`;

    // Find closest hour to noon
    let bestIdx = -1;
    let bestDiff = Infinity;
    for (let i = 0; i < times.length; i++) {
      if (times[i].startsWith(targetStr)) {
        const diff = Math.abs(new Date(times[i]).getTime() - new Date(noonStr).getTime());
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = i;
        }
      }
    }

    if (bestIdx >= 0) {
      const codes = getModelValues(forecast, 'weather_code', bestIdx);
      if (codes.length > 0) {
        const dominantCode = mode(codes);
        dayCategories.push({ day: target, category: categorizeCode(dominantCode) });
      }
    }
  }

  if (dayCategories.length < 3) return null;

  // Group consecutive days by category
  const groups: { category: WeatherCategory; startIdx: number; endIdx: number }[] = [];
  let current = { category: dayCategories[0].category, startIdx: 0, endIdx: 0 };

  for (let i = 1; i < dayCategories.length; i++) {
    if (dayCategories[i].category === current.category) {
      current.endIdx = i;
    } else {
      groups.push({ ...current });
      current = { category: dayCategories[i].category, startIdx: i, endIdx: i };
    }
  }
  groups.push(current);

  // Build sentence
  if (groups.length === 1) {
    const label = CATEGORY_LABELS[groups[0].category];
    return { icon: '📅', text: `Hele week ${label === 'zon' ? 'zonnig' : label}`, type: 'outlook' };
  }

  const parts: string[] = [];
  for (const g of groups) {
    const catLabel = CATEGORY_LABELS[g.category];
    if (g.startIdx === 0) {
      // First group: "Zon t/m woensdag" or just "Vandaag zon"
      if (g.endIdx === g.startIdx) {
        parts.push(`${getDutchDayName(dayCategories[g.startIdx].day, now)} ${catLabel}`);
      } else {
        const endDay = getDutchDayName(dayCategories[g.endIdx].day, now);
        parts.push(`${catLabel === 'zon' ? 'Zon' : catLabel.charAt(0).toUpperCase() + catLabel.slice(1)} t/m ${endDay}`);
      }
    } else {
      // Subsequent groups: "vanaf donderdag regen"
      const startDay = getDutchDayName(dayCategories[g.startIdx].day, now);
      if (g.category === 'rain') {
        parts.push(`vanaf ${startDay} regen`);
      } else if (g.category === 'sunny') {
        parts.push(`vanaf ${startDay} zon`);
      } else {
        parts.push(`vanaf ${startDay} ${catLabel}`);
      }
      break; // Only show first transition to keep it concise
    }
  }

  return { icon: '📅', text: parts.join(', '), type: 'outlook' };
}

// ─── Main export ───────────────────────────────────────────────

export function generateInsights(data: InsightData): WeatherInsight[] {
  const insights: WeatherInsight[] = [];

  insights.push(...warningInsights(data.warnings));

  const current = currentInsight(data.forecast, data.currentWeather);
  if (current) insights.push(current);

  const temp = temperatureInsight(data.forecast);
  if (temp) insights.push(temp);

  const precip = precipitationInsight(data.forecast);
  if (precip) insights.push(precip);

  const wind = windInsight(data.forecast);
  if (wind) insights.push(wind);

  const stook = stookwijzerInsight(data.stookwijzer);
  if (stook) insights.push(stook);

  const outlook = outlookInsight(data.forecast);
  if (outlook) insights.push(outlook);

  return insights;
}
