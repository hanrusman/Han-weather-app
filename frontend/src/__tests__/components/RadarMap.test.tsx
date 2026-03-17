import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RadarMap } from '../../components/RadarMap';

describe('RadarMap', () => {
  it('renders iframe with correct Buienradar URL', () => {
    const { container } = render(<RadarMap latitude={52.3738} longitude={4.8910} />);
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe!.src).toContain('gadgets.buienradar.nl');
    expect(iframe!.src).toContain('lat=52.3738');
    expect(iframe!.src).toContain('lng=4.8910');
  });

  it('renders section title', () => {
    const { container } = render(<RadarMap latitude={52.37} longitude={4.89} />);
    expect(container.textContent).toContain('Regenradar');
  });

  it('renders source attribution', () => {
    const { container } = render(<RadarMap latitude={52.37} longitude={4.89} />);
    expect(container.textContent).toContain('Buienradar / KNMI');
  });
});
