import { Router } from 'express';
import { fetchWarnings } from '../services/knmi';

export const warningsRouter = Router();

warningsRouter.get('/', async (_req, res) => {
  try {
    const data = await fetchWarnings();
    res.json(data);
  } catch (err) {
    console.error('Warnings error:', err);
    res.status(500).json({ error: 'Failed to fetch warnings' });
  }
});
