import { Router } from 'express';
import { config } from '../config';
import { fetchAirQuality } from '../services/airquality';

export const airqualityRouter = Router();

airqualityRouter.get('/', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string) || config.latitude;
    const lon = parseFloat(req.query.lon as string) || config.longitude;
    const data = await fetchAirQuality(lat, lon);
    res.json(data);
  } catch (err) {
    console.error('Air quality error:', err);
    res.status(500).json({ error: 'Failed to fetch air quality data' });
  }
});
