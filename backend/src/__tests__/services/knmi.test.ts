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
    province: 'Noord-Holland',
    knmiApiKey: '',
    knmiEdrApiKey: '',
    knmiWmsApiKey: '',
    cache: {
      warningsTtl: 600_000,
      radarTtl: 300_000,
      observationsTtl: 300_000,
      climateTtl: 86_400_000,
      stationsTtl: 604_800_000,
    },
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

import { parseWarningsXml } from '../../services/knmi/warnings';

describe('parseWarningsXml', () => {
  it('extracts a CAP-like warning with level, area, type, and timings', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<alert>
  <info>
    <event>Krachtige windstoten</event>
    <severity>yellow</severity>
    <effective>2026-06-03T09:00:00Z</effective>
    <expires>2026-06-03T18:00:00Z</expires>
    <description>Lokaal zware windstoten tot 90 km/u verwacht.</description>
    <area>
      <areaDesc>Noord-Holland</areaDesc>
    </area>
  </info>
</alert>`;
    const result = parseWarningsXml(xml);
    expect(result.length).toBeGreaterThan(0);
    const w = result[0];
    expect(w.level).toBe('yellow');
    expect(w.area.toLowerCase()).toContain('noord-holland');
    expect(w.type.toLowerCase()).toContain('windstoten');
    expect(w.validFrom).toContain('2026-06-03T09');
    expect(w.validUntil).toContain('2026-06-03T18');
    expect(w.description).toContain('windstoten');
  });

  it('skips green (no-warning) entries', () => {
    const xml = `<alert><info><event>weer</event><severity>green</severity><area><areaDesc>NL</areaDesc></area></info></alert>`;
    expect(parseWarningsXml(xml)).toEqual([]);
  });

  it('returns empty array on malformed XML', () => {
    expect(parseWarningsXml('<<<not xml>>>')).toEqual([]);
  });
});
