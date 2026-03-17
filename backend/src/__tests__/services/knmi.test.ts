import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../cache', () => ({
  cache: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
  },
}));

vi.mock('../../config', () => ({
  config: {
    province: 'Noord-Holland',
    knmiApiKey: '',
    cache: { warningsTtl: 600_000, radarTtl: 300_000 },
  },
}));

import { fetchWarnings, getRadarUrls } from '../../services/knmi';

describe('fetchWarnings', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mock('../../cache', () => ({
      cache: { get: vi.fn().mockReturnValue(null), set: vi.fn() },
    }));
  });

  it('returns empty warnings when no API key', async () => {
    const result = await fetchWarnings();
    expect(result.warnings).toEqual([]);
    expect(result.fetchedAt).toBeTruthy();
    expect(result.imageUrl).toContain('knmi.nl');
  });
});

describe('getRadarUrls', () => {
  it('returns radar URLs', () => {
    const result = getRadarUrls();
    expect(result.imageUrl).toContain('knmi.nl');
    expect(result.animationUrl).toContain('knmi.nl');
    expect(result.fetchedAt).toBeTruthy();
  });
});
