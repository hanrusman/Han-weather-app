import { describe, it, expect } from 'vitest';
import { getWeatherInfo } from '../../utils/weatherCodes';

describe('getWeatherInfo', () => {
  it('returns correct info for known codes', () => {
    const clear = getWeatherInfo(0);
    expect(clear.description).toBe('Onbewolkt');
    expect(clear.icon).toBe('☀️');

    const thunder = getWeatherInfo(95);
    expect(thunder.description).toBe('Onweer');
    expect(thunder.icon).toBe('⛈️');

    const cloudy = getWeatherInfo(3);
    expect(cloudy.description).toBe('Bewolkt');
    expect(cloudy.icon).toBe('☁️');

    const fog = getWeatherInfo(45);
    expect(fog.description).toBe('Mist');

    const snow = getWeatherInfo(75);
    expect(snow.description).toBe('Zware sneeuw');
  });

  it('returns fallback for unknown codes', () => {
    const unknown = getWeatherInfo(999);
    expect(unknown.description).toBe('Onbekend');
    expect(unknown.icon).toBe('❓');
  });
});
