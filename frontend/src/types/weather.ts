export type ModelId =
  | 'knmi_seamless'
  | 'icon_seamless'
  | 'ecmwf_ifs025'
  | 'gfs_seamless'
  | 'meteofrance_seamless';

export interface HourlyData {
  time: string[];
  temperature_2m: number[];
  precipitation: number[];
  wind_speed_10m: number[];
  wind_direction_10m?: number[];
  weather_code: number[];
  relative_humidity_2m?: number[];
  surface_pressure?: number[];
  apparent_temperature?: number[];
  cloud_cover?: number[];
  precipitation_probability?: number[];
  uv_index?: number[];
  sunshine_duration?: number[];
}

export interface DailyData {
  time: string[];
  sunrise: string[];
  sunset: string[];
}

export interface MultiModelForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  models: Record<string, HourlyData>;
  daily?: DailyData;
  fetchedAt: string;
}

export interface CurrentModelData {
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  apparentTemperature: number;
  weatherCode: number;
  cloudCover: number;
  uvIndex: number;
}

export interface CurrentWeatherResponse {
  models: Record<string, CurrentModelData>;
  daily?: DailyData;
  fetchedAt: string;
}

export interface AirQualityResponse {
  current: {
    europeanAqi: number;
    pm2_5: number;
    pm10: number;
    ozone: number;
    nitrogenDioxide: number;
  };
  hourly: {
    time: string[];
    european_aqi: number[];
    pm2_5: number[];
    pm10: number[];
  };
  fetchedAt: string;
}

export interface KnmiWarning {
  type: string;
  level: 'green' | 'yellow' | 'orange' | 'red';
  description: string;
  area: string;
  validFrom?: string;
  validUntil?: string;
}

export interface WarningsResponse {
  warnings: KnmiWarning[];
  imageUrl: string;
  fetchedAt: string;
  source?: 'ok' | 'no-key' | 'unauthorized' | 'error' | 'no-data';
}

export interface RadarResponse {
  imageUrl: string;
  animationUrl: string;
  source?: 'wms' | 'fallback';
  fetchedAt: string;
}

export interface ObservationStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceKm?: number;
}

export interface ObservationsResponse {
  station: ObservationStation | null;
  values: {
    temperature?: number;
    dewPoint?: number;
    humidity?: number;
    windSpeed?: number;       // m/s
    windGust?: number;        // m/s
    windDirection?: number;
    pressure?: number;
    visibility?: number;      // m
    sunshineDuration?: number;
    globalRadiation?: number;
    cloudCover?: number;
    precipitation?: number;
  };
  observedAt: string | null;
  fetchedAt: string;
  source: 'ok' | 'no-key' | 'unauthorized' | 'error' | 'no-data';
}

export interface ClimateResponse {
  stationId: string | null;
  stationName: string | null;
  monthDay: string;
  referenceWindow: string;
  normal: {
    meanT?: number;
    meanTmax?: number;
    meanTmin?: number;
    meanPrecip?: number;
    recordTmax?: number;
    recordTmin?: number;
    samples: number;
  } | null;
  fetchedAt: string;
  source: 'ok' | 'no-key' | 'unauthorized' | 'error' | 'no-data';
}

export interface StookwijzerResponse {
  advice: 'code_yellow' | 'code_orange' | 'code_red' | 'code_green';
  label: string;
  description: string;
  windSpeed?: number;
  airQualityIndex?: number;
  fetchedAt: string;
}

export interface AppConfig {
  latitude: number;
  longitude: number;
  locationName: string;
  province: string;
  models: ModelId[];
}

export interface SavedLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  province?: string;
  isGps?: boolean;
}

export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  admin2?: string;
  country: string;
  country_code: string;
}

export type WeatherVariable = 'temperature' | 'feelsLike' | 'precipitation' | 'wind';
export type TimeRange = '1d' | '3d' | '7d' | '14d';

export interface ChartDataPoint {
  time: string;
  [modelId: string]: number | string;
}
