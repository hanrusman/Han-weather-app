import { Router } from 'express';
import { getRadarUrls } from '../services/knmi';

export const radarRouter = Router();

radarRouter.get('/', (_req, res) => {
  try {
    const data = getRadarUrls();
    res.json(data);
  } catch (err) {
    console.error('Radar error:', err);
    res.status(500).json({ error: 'Failed to fetch radar data' });
  }
});
