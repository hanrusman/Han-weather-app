export const config = {
  port: parseInt(process.env.PORT || '3100', 10),
  latitude: parseFloat(process.env.LATITUDE || '52.37'),
  longitude: parseFloat(process.env.LONGITUDE || '4.89'),
  locationName: process.env.LOCATION_NAME || 'Amsterdam',
  province: process.env.PROVINCE || 'Noord-Holland',
  knmiApiKey: process.env.KNMI_API_KEY || '',
  // Optional per-API key overrides (fall back to KNMI_API_KEY when unset)
  knmiEdrApiKey: process.env.KNMI_EDR_API_KEY || process.env.KNMI_API_KEY || '',
  knmiWmsApiKey: process.env.KNMI_WMS_API_KEY || process.env.KNMI_API_KEY || '',
  haWebhookUrl: process.env.HA_WEBHOOK_URL || '',

  alerts: {
    checkInterval: 5 * 60 * 1000, // 5 min
  },

  cache: {
    forecastTtl: 20 * 60 * 1000,      // 20 min
    warningsTtl: 10 * 60 * 1000,      // 10 min
    stookwijzerTtl: 30 * 60 * 1000,   // 30 min
    radarTtl: 5 * 60 * 1000,          //  5 min
    airQualityTtl: 30 * 60 * 1000,   // 30 min
    observationsTtl: 5 * 60 * 1000,   //  5 min (10-min station obs)
    climateTtl: 24 * 60 * 60 * 1000,  // 24 h (historic normals)
    stationsTtl: 7 * 24 * 60 * 60 * 1000, // 7 d (station catalog)
  },

  models: [
    'knmi_seamless',
    'icon_seamless',
    'ecmwf_ifs025',
    'gfs_seamless',
    'meteofrance_seamless',
  ] as const,
};

export type WeatherModel = (typeof config.models)[number];
