import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CurrentWeather } from '../../components/CurrentWeather';
import { mockCurrentWeather } from '../fixtures/mockData';

describe('CurrentWeather', () => {
  it('renders the location name', () => {
    render(<CurrentWeather data={mockCurrentWeather} locationName="Amsterdam" />);
    expect(screen.getByText('Amsterdam')).toBeInTheDocument();
  });

  it('renders average temperature', () => {
    render(<CurrentWeather data={mockCurrentWeather} locationName="Test" />);
    // Average of 10.2, 10.5, 9.8, 10.0, 10.8 ≈ 10.26, rounds to 10
    expect(screen.getByText('10°')).toBeInTheDocument();
  });

  it('renders weather description', () => {
    render(<CurrentWeather data={mockCurrentWeather} locationName="Test" />);
    // KNMI model has weatherCode 3 = Bewolkt
    expect(screen.getByText('Bewolkt')).toBeInTheDocument();
  });

  it('renders wind, humidity, and pressure labels', () => {
    render(<CurrentWeather data={mockCurrentWeather} locationName="Test" />);
    expect(screen.getByText('Wind')).toBeInTheDocument();
    expect(screen.getByText('Vochtigheid')).toBeInTheDocument();
    expect(screen.getByText('Luchtdruk')).toBeInTheDocument();
  });

  it('renders per-model breakdown', () => {
    render(<CurrentWeather data={mockCurrentWeather} locationName="Test" />);
    // Model short names (last word): HARMONIE, IFS, ICON, GFS, Météo-France
    expect(screen.getByText('10.2°C')).toBeInTheDocument();
    expect(screen.getByText('10.5°C')).toBeInTheDocument();
  });

  it('returns null for empty models', () => {
    const { container } = render(
      <CurrentWeather data={{ models: {}, fetchedAt: '' }} locationName="Test" />
    );
    expect(container.firstChild).toBeNull();
  });
});
