import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DailyForecast } from '../../components/DailyForecast';
import { mockForecast } from '../fixtures/mockData';
import type { ModelId } from '../../types/weather';

const allEnabled = new Set<ModelId>([
  'knmi_seamless',
  'ecmwf_ifs025',
  'icon_seamless',
  'gfs_seamless',
  'meteofrance_seamless',
]);

describe('DailyForecast', () => {
  it('renders section title', () => {
    render(<DailyForecast forecast={mockForecast} enabledModels={allEnabled} />);
    expect(screen.getByText('7-daagse voorspelling')).toBeInTheDocument();
  });

  it('renders day labels', () => {
    const { container } = render(
      <DailyForecast forecast={mockForecast} enabledModels={allEnabled} />
    );
    // Should render day abbreviations (ma, di, wo, do, vr, za, zo)
    const text = container.textContent || '';
    // At least a few day labels should be present
    const dayLabels = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
    const found = dayLabels.filter((d) => text.includes(d));
    expect(found.length).toBeGreaterThanOrEqual(4);
  });

  it('renders nothing when no enabled models', () => {
    const { container } = render(
      <DailyForecast forecast={mockForecast} enabledModels={new Set()} />
    );
    expect(container.firstChild).toBeNull();
  });
});
