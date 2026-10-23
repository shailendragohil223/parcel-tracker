import './env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import trackRoutes from './routes/track.js';

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

app.set('trust proxy', 1);
// OpenStreetMap map tiles require the site address (Referer) on each request, and
// helmet's default "no-referrer" makes OSM answer 403 "Access blocked".
app.use(helmet({ contentSecurityPolicy: false, referrerPolicy: { policy: 'strict-origin-when-cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || true }));
app.use(express.json());

// Stops people from guessing phone numbers / AWBs in bulk.
app.use('/api/track', rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many searches. Please wait a minute and try again.' } }));

app.use('/api', trackRoutes);

// In production, serve the built React app from the same server (handy for GoDaddy / single Node host).
const clientDist = join(__dirname, '../../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(join(clientDist, 'index.html')));
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Parcel tracker API on http://localhost:${PORT}`);
  const wanted = (process.env.PROVIDERS || 'local,trackcourier').split(',').map((s) => s.trim());
  if (wanted.includes('trackcourier') && !process.env.TRACKCOURIER_API_KEY) {
    console.warn('⚠  TrackCourier.io is OFF: set TRACKCOURIER_API_KEY in server/.env and restart.');
  }
});
