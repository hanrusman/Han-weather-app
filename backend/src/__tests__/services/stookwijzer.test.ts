import { describe, it, expect, vi, beforeEach } from 'vitest';

// Must mock cache before importing the service
vi.mock('../../cache', () => ({
  cache: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
  },
}));

import { fetchStookwijzer } from '../../services/stookwijzer';

describe('fetchStookwijzer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Re-mock cache after restore
    vi.mock('../../cache', () => ({
      cache: {
        get: vi.fn().mockReturnValue(null),
        set: vi.fn(),
      },
    }));
  });

  it('returns correct shape on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        advice: 'code_orange',
        description: 'Slechte luchtkwaliteit',
      }),
    }));

    const result = await fetchStookwijzer(52.37, 4.89);
    expect(result.advice).toBe('code_orange');
    expect(result.label).toBe('Liever niet stoken');
    expect(result.fetchedAt).toBeTruthy();
  });

  it('calls correct API URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ advice: 'code_green' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await fetchStookwijzer(52.38, 4.64);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('stookwijzer.nu/api/forecast');
    expect(url).toContain('lat=52.38');
    expect(url).toContain('lng=4.64');
  });

  it('returns code_green default on error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network')));
    const result = await fetchStookwijzer(52.37, 4.89);
    expect(result.advice).toBe('code_green');
    expect(result.label).toBe('Stoken mag');
  });
});
