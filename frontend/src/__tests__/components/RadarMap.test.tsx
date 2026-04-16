import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import RadarMap from '../../components/RadarMap';

describe('RadarMap', () => {
  it('renders radar image with Buienradar URL', () => {
    const { container } = render(<RadarMap latitude={52.3738} longitude={4.8910} />);
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img!.src).toContain('image.buienradar.nl');
    expect(img!.src).toContain('RadarMapRainNL');
    expect(img!.alt).toContain('regenradar');
  });

  it('renders section title', () => {
    const { container } = render(<RadarMap latitude={52.37} longitude={4.89} />);
    expect(container.textContent).toContain('Regenradar');
  });

  it('renders source attribution', () => {
    const { container } = render(<RadarMap latitude={52.37} longitude={4.89} />);
    expect(container.textContent).toContain('Buienradar / KNMI');
  });

  it('renders refresh button', () => {
    const { container } = render(<RadarMap latitude={52.37} longitude={4.89} />);
    const refreshBtn = container.querySelector('button');
    expect(refreshBtn).toBeTruthy();
    expect(refreshBtn!.title).toBe('Ververs radar');
  });
});
