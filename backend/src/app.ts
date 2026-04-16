import express from 'express';
import compression from 'compression';
import cors from 'cors';
import path from 'path';
import expressStaticGzip from 'express-static-gzip';
import { config } from './config';
import { forecastRouter } from './routes/forecast';
import { currentRouter } from './routes/current';
import { radarRouter } from './routes/radar';
import { warningsRouter } from './routes/warnings';
import { stookwijzerRouter } from './routes/stookwijzer';
import { airqualityRouter } from './routes/airquality';
import { checkAlerts } from './services/alerts';

export const app = express();

// Compress API responses (static files handled by express-static-gzip)
app.use(compression());
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/forecast', forecastRouter);
app.use('/api/current', currentRouter);
app.use('/api/radar', radarRouter);
app.use('/api/warnings', warningsRouter);
app.use('/api/stookwijzer', stookwijzerRouter);
app.use('/api/airquality', airqualityRouter);

// Config endpoint
app.get('/api/config', (_req, res) => {
  res.json({
    latitude: config.latitude,
    longitude: config.longitude,
    locationName: config.locationName,
    province: config.province,
    models: config.models,
  });
});

// Serve frontend in production — pre-compressed Brotli/Gzip with immutable cache
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(expressStaticGzip(frontendDist, {
  enableBrotli: true,
  orderPreference: ['br', 'gzip'],
  serveStatic: {
    maxAge: '1y',
    immutable: true,
    index: false, // don't serve index.html with immutable cache
  },
}));
// index.html: no-cache so updates are always fetched
app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Manual alert check endpoint (for testing)
app.post('/api/alerts/check', async (_req, res) => {
  if (!config.haWebhookUrl) {
    res.status(400).json({ error: 'HA_WEBHOOK_URL not configured' });
    return;
  }
  await checkAlerts();
  res.json({ ok: true });
});
