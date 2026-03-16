import { config } from '../config';
import { cache } from '../cache';

export interface Warning {
  type: string;
  level: 'green' | 'yellow' | 'orange' | 'red';
  description: string;
  area: string;
  validFrom?: string;
  validUntil?: string;
}

export interface WarningsResponse {
  warnings: Warning[];
  imageUrl: string;
  fetchedAt: string;
}

export async function fetchWarnings(): Promise<WarningsResponse> {
  const cacheKey = `warnings:${config.province}`;
  const cached = cache.get<WarningsResponse>(cacheKey);
  if (cached) return cached;

  const warnings: Warning[] = [];

  // Try KNMI API if key is available
  if (config.knmiApiKey) {
    try {
      const res = await fetch(
        'https://api.dataplatform.knmi.nl/open-data/v1/datasets/weather_warnings/versions/1.0/files',
        { headers: { Authorization: config.knmiApiKey } }
      );
      if (res.ok) {
        const data = (await res.json()) as { files?: { filename: string }[] };
        const files = data?.files || [];
        if (files.length > 0) {
          const latest = files[files.length - 1];
          const fileRes = await fetch(
            `https://api.dataplatform.knmi.nl/open-data/v1/datasets/weather_warnings/versions/1.0/files/${latest.filename}/url`,
            { headers: { Authorization: config.knmiApiKey } }
          );
          if (fileRes.ok) {
            const fileData = (await fileRes.json()) as { temporaryDownloadUrl: string };
            // Fetch actual warning data from temporary URL
            const warningRes = await fetch(fileData.temporaryDownloadUrl);
            if (warningRes.ok) {
              const warningText = await warningRes.text();
              // Basic XML parsing for warnings - in production you'd use a proper XML parser
              if (warningText.includes('yellow') || warningText.includes('orange') || warningText.includes('red')) {
                warnings.push({
                  type: 'weather',
                  level: 'yellow',
                  description: 'Waarschuwing actief - zie KNMI.nl voor details',
                  area: config.province,
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('KNMI warnings fetch error:', err);
    }
  }

  const result: WarningsResponse = {
    warnings,
    imageUrl: 'https://cdn.knmi.nl/knmi/map/current/weather/warning/waarschuwing_land_0_new.gif',
    fetchedAt: new Date().toISOString(),
  };

  cache.set(cacheKey, result, config.cache.warningsTtl);
  return result;
}

export interface RadarResponse {
  imageUrl: string;
  animationUrl: string;
  fetchedAt: string;
}

export function getRadarUrls(): RadarResponse {
  const cacheKey = 'radar';
  const cached = cache.get<RadarResponse>(cacheKey);
  if (cached) return cached;

  const result: RadarResponse = {
    imageUrl: 'https://cdn.knmi.nl/knmi/map/current/weather/radar/radar_met_ondergrond.gif',
    animationUrl: 'https://cdn.knmi.nl/knmi/map/current/weather/radar/radar_met_ondergrond.gif',
    fetchedAt: new Date().toISOString(),
  };

  cache.set(cacheKey, result, config.cache.radarTtl);
  return result;
}
