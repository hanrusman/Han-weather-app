import { Router } from 'express';
import { config } from '../config';
import { fetchMultiModelForecast } from '../services/openmeteo';

export const forecastRouter = Router();

forecastRouter.get('/', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string) || config.latitude;
    const lon = parseFloat(req.query.lon as string) || config.longitude;
    const days = parseInt(req.query.days as string) || 7;
    const data = await fetchMultiModelForecast(lat, lon, days);
    res.json(data);
  } catch (err) {
    console.error('Forecast error:', err);
    res.status(500).json({ error: 'Failed to fetch forecast data' });
  }
});
