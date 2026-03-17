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
  weather_code: number[];
  relative_humidity_2m?: number[];
  surface_pressure?: number[];
  apparent_temperature?: number[];
  cloud_cover?: number[];
  precipitation_probability?: number[];
}

export interface MultiModelForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  models: Record<string, HourlyData>;
  fetchedAt: string;
}

export interface CurrentModelData {
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  apparentTemperature: number;
  weatherCode: number;
  cloudCover: number;
}

export interface CurrentWeatherResponse {
  models: Record<string, CurrentModelData>;
  fetchedAt: string;
}

export interface WarningsResponse {
  warnings: {
    type: string;
    level: 'green' | 'yellow' | 'orange' | 'red';
    description: string;
    area: string;
  }[];
  imageUrl: string;
  fetchedAt: string;
}

export interface RadarResponse {
  imageUrl: string;
  animationUrl: string;
  fetchedAt: string;
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
