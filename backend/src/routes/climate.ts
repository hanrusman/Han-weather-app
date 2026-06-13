import { Router } from 'express';
import { config } from '../config';
import { fetchClimateNormal } from '../services/knmi';

export const climateRouter = Router();

climateRouter.get('/', async (req, res) => {
  try {
    const latRaw = typeof req.query.lat === 'string' ? parseFloat(req.query.lat) : config.latitude;
    const lonRaw = typeof req.query.lon === 'string' ? parseFloat(req.query.lon) : config.longitude;
    const lat = Number.isFinite(latRaw) ? latRaw : config.latitude;
    const lon = Number.isFinite(lonRaw) ? lonRaw : config.longitude;
    const data = await fetchClimateNormal(lat, lon);
    res.json(data);
  } catch (err) {
    console.error('Climate error:', err);
    res.status(500).json({ error: 'Failed to fetch climate normals' });
  }
});
