import type {
  CurrentWeatherResponse,
  MultiModelForecast,
  WarningsResponse,
  StookwijzerResponse,
  HourlyData,
} from '../../types/weather';

function makeHourlyData(hours: number): HourlyData {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return {
    time: Array.from({ length: hours }, (_, i) => {
      const d = new Date(now.getTime() + i * 3600_000);
      return d.toISOString().slice(0, 16);
    }),
    temperature_2m: Array.from({ length: hours }, (_, i) => 8 + Math.sin(i / 4) * 5),
    precipitation: Array.from({ length: hours }, () => Math.random() * 2),
    wind_speed_10m: Array.from({ length: hours }, () => 15 + Math.random() * 10),
    weather_code: Array.from({ length: hours }, () => 3),
    relative_humidity_2m: Array.from({ length: hours }, () => 75),
    surface_pressure: Array.from({ length: hours }, () => 1013),
    apparent_temperature: Array.from({ length: hours }, (_, i) => 6 + Math.sin(i / 4) * 4),
    precipitation_probability: Array.from({ length: hours }, () => 40),
  };
}

export const mockForecast: MultiModelForecast = {
  latitude: 52.37,
  longitude: 4.89,
  timezone: 'Europe/Amsterdam',
  models: {
    knmi_seamless: makeHourlyData(168),
    ecmwf_ifs025: makeHourlyData(168),
    icon_seamless: makeHourlyData(168),
    gfs_seamless: makeHourlyData(168),
    meteofrance_seamless: makeHourlyData(168),
  },
  fetchedAt: new Date().toISOString(),
};

export const mockCurrentWeather: CurrentWeatherResponse = {
  models: {
    knmi_seamless: {
      temperature: 10.2,
      humidity: 78,
      pressure: 1015,
      windSpeed: 22,
      apparentTemperature: 7.5,
      weatherCode: 3,
      cloudCover: 85,
    },
    ecmwf_ifs025: {
      temperature: 10.5,
      humidity: 76,
      pressure: 1014,
      windSpeed: 20,
      apparentTemperature: 7.8,
      weatherCode: 3,
      cloudCover: 80,
    },
    icon_seamless: {
      temperature: 9.8,
      humidity: 80,
      pressure: 1015,
      windSpeed: 24,
      apparentTemperature: 6.9,
      weatherCode: 61,
      cloudCover: 90,
    },
    gfs_seamless: {
      temperature: 10.0,
      humidity: 77,
      pressure: 1013,
      windSpeed: 21,
      apparentTemperature: 7.2,
      weatherCode: 3,
      cloudCover: 82,
    },
    meteofrance_seamless: {
      temperature: 10.8,
      humidity: 74,
      pressure: 1016,
      windSpeed: 19,
      apparentTemperature: 8.1,
      weatherCode: 2,
      cloudCover: 75,
    },
  },
  fetchedAt: new Date().toISOString(),
};

export const mockWarnings: WarningsResponse = {
  warnings: [
    {
      type: 'wind',
      level: 'yellow',
      description: 'Krachtige wind verwacht',
      area: 'Noord-Holland',
    },
  ],
  imageUrl: 'https://example.com/warnings.gif',
  fetchedAt: new Date().toISOString(),
};

export const mockWarningsEmpty: WarningsResponse = {
  warnings: [],
  imageUrl: 'https://example.com/warnings.gif',
  fetchedAt: new Date().toISOString(),
};

export const mockStookwijzer: StookwijzerResponse = {
  advice: 'code_green',
  label: 'Stoken mag',
  description: 'De luchtkwaliteit is goed',
  fetchedAt: new Date().toISOString(),
};
