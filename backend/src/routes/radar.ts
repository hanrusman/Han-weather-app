import { Router } from 'express';
import type { Request, Response } from 'express';
import { getRadarUrls, fetchRadarImage } from '../services/knmi';

export const radarRouter = Router();

function parseLatLon(query: Record<string, unknown>): { lat?: number; lon?: number } {
  const lat = typeof query.lat === 'string' ? parseFloat(query.lat) : undefined;
  const lon = typeof query.lon === 'string' ? parseFloat(query.lon) : undefined;
  return {
    lat: lat !== undefined && Number.isFinite(lat) ? lat : undefined,
    lon: lon !== undefined && Number.isFinite(lon) ? lon : undefined,
  };
}

radarRouter.get('/', (req, res) => {
  try {
    const { lat, lon } = parseLatLon(req.query as Record<string, unknown>);
    const data = getRadarUrls(lat, lon);
    res.json(data);
  } catch (err) {
    console.error('Radar error:', err);
    res.status(500).json({ error: 'Failed to fetch radar data' });
  }
});

/**
 * Proxy the rendered WMS PNG so the API key stays on the server.
 * Mounted directly at /api/radar.png (see app.ts).
 */
export async function radarImageHandler(req: Request, res: Response): Promise<void> {
  try {
    const { lat, lon } = parseLatLon(req.query as Record<string, unknown>);
    const zoom = typeof req.query.zoom === 'string' ? parseFloat(req.query.zoom) : 1.5;
    if (lat === undefined || lon === undefined) {
      res.status(400).json({ error: 'lat and lon required' });
      return;
    }
    const img = await fetchRadarImage(lat, lon, Number.isFinite(zoom) ? zoom : 1.5);
    if (!img.body) {
      // Redirect to the public CDN fallback so the <img> still renders
      res.redirect(302, 'https://cdn.knmi.nl/knmi/map/current/weather/radar/radar_met_ondergrond.gif');
      return;
    }
    res.setHeader('Content-Type', img.contentType);
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min
    res.send(img.body);
  } catch (err) {
    console.error('Radar image error:', err);
    res.status(500).json({ error: 'Failed to fetch radar image' });
  }
}
