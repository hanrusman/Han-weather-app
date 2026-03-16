import { Router } from 'express';
import { config } from '../config';
import { fetchCurrentWeather } from '../services/openmeteo';

export const currentRouter = Router();

currentRouter.get('/', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string) || config.latitude;
    const lon = parseFloat(req.query.lon as string) || config.longitude;
    const data = await fetchCurrentWeather(lat, lon);
    res.json(data);
  } catch (err) {
    console.error('Current weather error:', err);
    res.status(500).json({ error: 'Failed to fetch current weather' });
  }
});
