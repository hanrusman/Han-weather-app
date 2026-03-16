// WMO Weather interpretation codes (WW)
// https://open-meteo.com/en/docs

interface WeatherInfo {
  description: string;
  icon: string;
}

const WEATHER_CODES: Record<number, WeatherInfo> = {
  0: { description: 'Onbewolkt', icon: '☀️' },
  1: { description: 'Overwegend helder', icon: '🌤️' },
  2: { description: 'Half bewolkt', icon: '⛅' },
  3: { description: 'Bewolkt', icon: '☁️' },
  45: { description: 'Mist', icon: '🌫️' },
  48: { description: 'Aanvriezende mist', icon: '🌫️' },
  51: { description: 'Lichte motregen', icon: '🌦️' },
  53: { description: 'Motregen', icon: '🌦️' },
  55: { description: 'Dichte motregen', icon: '🌧️' },
  56: { description: 'Aanvriezende motregen', icon: '🌧️' },
  57: { description: 'Dichte aanvriezende motregen', icon: '🌧️' },
  61: { description: 'Lichte regen', icon: '🌦️' },
  63: { description: 'Regen', icon: '🌧️' },
  65: { description: 'Zware regen', icon: '🌧️' },
  66: { description: 'Aanvriezende regen', icon: '🌧️' },
  67: { description: 'Zware aanvriezende regen', icon: '🌧️' },
  71: { description: 'Lichte sneeuw', icon: '🌨️' },
  73: { description: 'Sneeuw', icon: '🌨️' },
  75: { description: 'Zware sneeuw', icon: '❄️' },
  77: { description: 'Sneeuwkorrels', icon: '🌨️' },
  80: { description: 'Lichte buien', icon: '🌦️' },
  81: { description: 'Buien', icon: '🌧️' },
  82: { description: 'Zware buien', icon: '🌧️' },
  85: { description: 'Lichte sneeuwbuien', icon: '🌨️' },
  86: { description: 'Zware sneeuwbuien', icon: '❄️' },
  95: { description: 'Onweer', icon: '⛈️' },
  96: { description: 'Onweer met hagel', icon: '⛈️' },
  99: { description: 'Onweer met zware hagel', icon: '⛈️' },
};

export function getWeatherInfo(code: number): WeatherInfo {
  return WEATHER_CODES[code] || { description: 'Onbekend', icon: '❓' };
}
