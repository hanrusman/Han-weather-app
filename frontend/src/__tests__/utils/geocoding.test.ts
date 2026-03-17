import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchLocations } from '../../utils/geocoding';

describe('searchLocations', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends correct params to Open-Meteo geocoding API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await searchLocations('Haarlem');

    expect(mockFetch).toHaveBeenCalledOnce();
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('geocoding-api.open-meteo.com');
    expect(url).toContain('name=Haarlem');
    expect(url).toContain('count=5');
    expect(url).toContain('language=nl');
    expect(url).toContain('country_code=NL');
  });

  it('returns mapped results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        results: [
          { id: 1, name: 'Haarlem', latitude: 52.38, longitude: 4.64, admin1: 'Noord-Holland', admin2: 'Haarlem', country: 'Netherlands', country_code: 'NL' },
        ],
      }),
    }));

    const results = await searchLocations('Haarlem');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Haarlem');
    expect(results[0].latitude).toBe(52.38);
  });

  it('returns empty array on error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const results = await searchLocations('fail');
    expect(results).toEqual([]);
  });

  it('returns empty array when no results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }));
    const results = await searchLocations('xyznonexistent');
    expect(results).toEqual([]);
  });
});
