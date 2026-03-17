import { describe, it, expect } from 'vitest';
import {
  formatTemp,
  formatTempFull,
  kmhToBeaufort,
  formatWind,
  formatWindFull,
  formatPrecip,
  formatPressure,
  formatHumidity,
  averageValues,
} from '../../utils/formatting';

describe('formatTemp', () => {
  it('rounds to integer and adds °', () => {
    expect(formatTemp(10.3)).toBe('10°');
    expect(formatTemp(10.7)).toBe('11°');
    expect(formatTemp(-2.4)).toBe('-2°');
    expect(formatTemp(0)).toBe('0°');
  });
});

describe('formatTempFull', () => {
  it('shows 1 decimal with °C', () => {
    expect(formatTempFull(10.24)).toBe('10.2°C');
    expect(formatTempFull(10.25)).toBe('10.3°C');
    expect(formatTempFull(-3)).toBe('-3.0°C');
  });
});

describe('kmhToBeaufort', () => {
  it('converts boundary values correctly', () => {
    expect(kmhToBeaufort(0)).toBe(0);    // < 1
    expect(kmhToBeaufort(1)).toBe(1);    // >= 1, < 6
    expect(kmhToBeaufort(5)).toBe(1);
    expect(kmhToBeaufort(6)).toBe(2);    // >= 6, < 12
    expect(kmhToBeaufort(12)).toBe(3);   // >= 12, < 20
    expect(kmhToBeaufort(20)).toBe(4);   // >= 20, < 29
    expect(kmhToBeaufort(118)).toBe(12); // >= 118
    expect(kmhToBeaufort(200)).toBe(12);
  });
});

describe('formatWind', () => {
  it('formats as bft', () => {
    expect(formatWind(0)).toBe('0 bft');
    expect(formatWind(25)).toBe('4 bft');
  });
});

describe('formatWindFull', () => {
  it('shows bft with km/u in parentheses', () => {
    expect(formatWindFull(25)).toBe('4 bft (25 km/u)');
    expect(formatWindFull(0)).toBe('0 bft (0 km/u)');
  });
});

describe('formatPrecip', () => {
  it('shows 1 decimal with mm', () => {
    expect(formatPrecip(3.14)).toBe('3.1 mm');
    expect(formatPrecip(0)).toBe('0.0 mm');
  });
});

describe('formatPressure', () => {
  it('rounds and adds hPa', () => {
    expect(formatPressure(1013.25)).toBe('1013 hPa');
    expect(formatPressure(1015.7)).toBe('1016 hPa');
  });
});

describe('formatHumidity', () => {
  it('rounds and adds %', () => {
    expect(formatHumidity(75.4)).toBe('75%');
    expect(formatHumidity(75.5)).toBe('76%');
  });
});

describe('averageValues', () => {
  it('returns 0 for empty array', () => {
    expect(averageValues([])).toBe(0);
  });

  it('averages correctly', () => {
    expect(averageValues([10, 20])).toBe(15);
    expect(averageValues([10, 20, 30])).toBe(20);
    expect(averageValues([5])).toBe(5);
  });
});
