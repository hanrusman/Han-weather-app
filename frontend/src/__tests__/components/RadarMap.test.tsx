import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import RadarMap from '../../components/RadarMap';

describe('RadarMap', () => {
  it('renders KNMI WMS GetMap URLs for the radar layer', () => {
    const { container } = render(<RadarMap latitude={52.3738} longitude={4.8910} />);
    const imgs = container.querySelectorAll('img');
    expect(imgs.length).toBeGreaterThan(0);
    const radarImg = Array.from(imgs).find((i) => i.alt.includes('KNMI radar'));
    expect(radarImg).toBeTruthy();
    expect(radarImg!.src).toContain('anonymous.api.dataplatform.knmi.nl');
    expect(radarImg!.src).toContain('precipitation_nowcast');
    expect(radarImg!.src).toContain('TIME=');
  });

  it('renders section title', () => {
    const { container } = render(<RadarMap latitude={52.37} longitude={4.89} />);
    expect(container.textContent).toContain('Regenradar');
  });

  it('renders KNMI attribution', () => {
    const { container } = render(<RadarMap latitude={52.37} longitude={4.89} />);
    expect(container.textContent).toContain('KNMI radar nowcast');
  });

  it('renders play and now controls', () => {
    const { container } = render(<RadarMap latitude={52.37} longitude={4.89} />);
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    const titles = Array.from(buttons).map((b) => b.title);
    expect(titles).toContain('Pauze'); // playing by default → button title is "Pauze"
    expect(titles).toContain('Spring naar nu');
  });

  it('preloads multiple frames around now', () => {
    const { container } = render(<RadarMap latitude={52.37} longitude={4.89} />);
    const imgs = container.querySelectorAll('img');
    // 25 preload frames + 1 visible radar + 1 basemap
    expect(imgs.length).toBeGreaterThan(20);
  });
});
