import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../cache', () => ({
  cache: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
  },
}));

vi.mock('../../config', () => ({
  config: {
    latitude: 52.37,
    longitude: 4.89,
    models: ['knmi_seamless', 'ecmwf_ifs025', 'icon_seamless', 'gfs_seamless', 'meteofrance_seamless'],
    cache: { forecastTtl: 1200_000 },
  },
}));

import { fetchMultiModelForecast } from '../../services/openmeteo';

function makeMockHourly(hours: number) {
  return {
    time: Array.from({ length: hours }, (_, i) => `2026-03-17T${String(i).padStart(2, '0')}:00`),
    temperature_2m: Array(hours).fill(10),
    precipitation: Array(hours).fill(0),
    wind_speed_10m: Array(hours).fill(15),
    weather_code: Array(hours).fill(3),
    relative_humidity_2m: Array(hours).fill(75),
    surface_pressure: Array(hours).fill(1013),
    apparent_temperature: Array(hours).fill(8),
    cloud_cover: Array(hours).fill(80),
    precipitation_probability: Array(hours).fill(30),
  };
}

describe('fetchMultiModelForecast', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mock('../../cache', () => ({
      cache: { get: vi.fn().mockReturnValue(null), set: vi.fn() },
    }));
  });

  it('fetches all 5 models and returns correct shape', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        latitude: 52.37,
        longitude: 4.89,
        timezone: 'Europe/Amsterdam',
        hourly: makeMockHourly(24),
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await fetchMultiModelForecast(52.37, 4.89, 1);

    expect(mockFetch).toHaveBeenCalledTimes(5);
    expect(result.latitude).toBe(52.37);
    expect(result.longitude).toBe(4.89);
    expect(result.timezone).toBe('Europe/Amsterdam');
    expect(Object.keys(result.models)).toHaveLength(5);
    expect(result.fetchedAt).toBeTruthy();
  });

  it('constructs correct Open-Meteo URLs', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        latitude: 52.38,
        longitude: 4.64,
        timezone: 'Europe/Amsterdam',
        hourly: makeMockHourly(24),
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await fetchMultiModelForecast(52.38, 4.64, 1);

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('api.open-meteo.com/v1/forecast');
    expect(url).toContain('latitude=52.38');
    expect(url).toContain('longitude=4.64');
    expect(url).toContain('temperature_2m');
    expect(url).toContain('precipitation_probability');
  });

  it('handles failed model fetch gracefully', async () => {
    let callCount = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ ok: false, status: 500 });
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          latitude: 52.37, longitude: 4.89, timezone: 'Europe/Amsterdam',
          hourly: makeMockHourly(24),
        }),
      });
    }));

    const result = await fetchMultiModelForecast(52.37, 4.89, 1);
    // 4 models should succeed, 1 failed
    expect(Object.keys(result.models).length).toBe(4);
  });
});
