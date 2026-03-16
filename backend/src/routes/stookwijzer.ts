import { Router } from 'express';
import { config } from '../config';
import { fetchStookwijzer } from '../services/stookwijzer';

export const stookwijzerRouter = Router();

stookwijzerRouter.get('/', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string) || config.latitude;
    const lon = parseFloat(req.query.lon as string) || config.longitude;
    const data = await fetchStookwijzer(lat, lon);
    res.json(data);
  } catch (err) {
    console.error('Stookwijzer error:', err);
    res.status(500).json({ error: 'Failed to fetch stookwijzer data' });
  }
});
