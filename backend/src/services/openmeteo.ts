import { config } from '../config';
import { cache } from '../cache';

interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
  precipitation: number[];
  wind_speed_10m: number[];
  weather_code: number[];
  relative_humidity_2m?: number[];
  surface_pressure?: number[];
  apparent_temperature?: number[];
  cloud_cover?: number[];
  precipitation_probability?: number[];
}

interface OpenMeteoCurrentWeather {
  time: string;
  temperature: number;
  weathercode: number;
  windspeed: number;
  winddirection: number;
}

interface OpenMeteoModelResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: OpenMeteoHourly;
  current_weather?: OpenMeteoCurrentWeather;
}

export interface MultiModelForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  models: Record<string, OpenMeteoHourly>;
  fetchedAt: string;
}

export async function fetchMultiModelForecast(
  lat: number = config.latitude,
  lon: number = config.longitude,
  forecastDays: number = 7
): Promise<MultiModelForecast> {
  const cacheKey = `forecast:${lat}:${lon}:${forecastDays}`;
  const cached = cache.get<MultiModelForecast>(cacheKey);
  if (cached) return cached;

  const models: Record<string, OpenMeteoHourly> = {};

  // Fetch each model separately to get per-model data
  const modelFetches = config.models.map(async (model) => {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: 'temperature_2m,precipitation,precipitation_probability,wind_speed_10m,weather_code,relative_humidity_2m,surface_pressure,apparent_temperature,cloud_cover',
      models: model,
      forecast_days: forecastDays.toString(),
      timezone: 'Europe/Amsterdam',
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Open-Meteo error for ${model}: ${res.status}`);
      return;
    }
    const data = (await res.json()) as OpenMeteoModelResponse;
    models[model] = data.hourly;
  });

  await Promise.all(modelFetches);

  const result: MultiModelForecast = {
    latitude: lat,
    longitude: lon,
    timezone: 'Europe/Amsterdam',
    models,
    fetchedAt: new Date().toISOString(),
  };

  cache.set(cacheKey, result, config.cache.forecastTtl);
  return result;
}

export interface CurrentWeatherData {
  models: Record<string, {
    temperature: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    apparentTemperature: number;
    weatherCode: number;
    cloudCover: number;
  }>;
  fetchedAt: string;
}

export async function fetchCurrentWeather(
  lat: number = config.latitude,
  lon: number = config.longitude
): Promise<CurrentWeatherData> {
  const cacheKey = `current:${lat}:${lon}`;
  const cached = cache.get<CurrentWeatherData>(cacheKey);
  if (cached) return cached;

  // Get the current hour's data from the forecast
  const forecast = await fetchMultiModelForecast(lat, lon, 1);
  const now = new Date();
  const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).toISOString().slice(0, 16);

  const models: CurrentWeatherData['models'] = {};

  for (const [model, hourly] of Object.entries(forecast.models)) {
    const idx = hourly.time.findIndex((t) => t === currentHour);
    const i = idx >= 0 ? idx : 0;

    models[model] = {
      temperature: hourly.temperature_2m[i],
      humidity: hourly.relative_humidity_2m?.[i] ?? 0,
      pressure: hourly.surface_pressure?.[i] ?? 0,
      windSpeed: hourly.wind_speed_10m[i],
      apparentTemperature: hourly.apparent_temperature?.[i] ?? hourly.temperature_2m[i],
      weatherCode: hourly.weather_code[i],
      cloudCover: hourly.cloud_cover?.[i] ?? 0,
    };
  }

  const result: CurrentWeatherData = { models, fetchedAt: new Date().toISOString() };
  cache.set(cacheKey, result, config.cache.forecastTtl);
  return result;
}
