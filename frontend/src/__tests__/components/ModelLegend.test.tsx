import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelLegend } from '../../components/ModelLegend';
import type { ModelId } from '../../types/weather';

const allModels: ModelId[] = [
  'knmi_seamless',
  'ecmwf_ifs025',
  'icon_seamless',
  'gfs_seamless',
  'meteofrance_seamless',
];

describe('ModelLegend', () => {
  it('renders all 5 model names', () => {
    render(
      <ModelLegend allModels={allModels} isEnabled={() => true} onToggle={() => {}} />
    );
    expect(screen.getByText('🇳🇱 KNMI')).toBeInTheDocument();
    expect(screen.getByText('🇪🇺 ECMWF')).toBeInTheDocument();
    expect(screen.getByText('🇩🇪 DWD ICON')).toBeInTheDocument();
    expect(screen.getByText('🇺🇸 NOAA GFS')).toBeInTheDocument();
    expect(screen.getByText('🇫🇷 Météo-France')).toBeInTheDocument();
  });

  it('calls onToggle when a model is clicked', () => {
    const onToggle = vi.fn();
    render(
      <ModelLegend allModels={allModels} isEnabled={() => true} onToggle={onToggle} />
    );
    fireEvent.click(screen.getByText('🇪🇺 ECMWF'));
    expect(onToggle).toHaveBeenCalledWith('ecmwf_ifs025');
  });
});
