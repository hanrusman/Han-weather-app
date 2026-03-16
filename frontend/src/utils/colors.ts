import type { ModelId } from '../types/weather';

export const MODEL_COLORS: Record<ModelId, string> = {
  knmi_seamless: '#FF6B00',
  ecmwf_ifs025: '#2563EB',
  icon_seamless: '#DC2626',
  gfs_seamless: '#7C3AED',
  meteofrance_seamless: '#06B6D4',
};

export const MODEL_LABELS: Record<ModelId, string> = {
  knmi_seamless: 'KNMI HARMONIE',
  ecmwf_ifs025: 'ECMWF IFS',
  icon_seamless: 'DWD ICON',
  gfs_seamless: 'NOAA GFS',
  meteofrance_seamless: 'Météo-France',
};

export const STOOKWIJZER_COLORS: Record<string, string> = {
  code_green: '#22C55E',
  code_yellow: '#EAB308',
  code_orange: '#F97316',
  code_red: '#EF4444',
};

export const WARNING_COLORS: Record<string, string> = {
  green: '#22C55E',
  yellow: '#EAB308',
  orange: '#F97316',
  red: '#EF4444',
};
