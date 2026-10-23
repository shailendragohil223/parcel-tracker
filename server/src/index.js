import './env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { existsSync, readFileSync } from 'node:fs';
import { pageFor, renderPage, sitemapXml, robotsTxt } from './seo.js';
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

app.use('/api', (_req, res, next) => { res.set('X-Robots-Tag', 'noindex'); next(); });
app.use('/api', trackRoutes);

app.get('/sitemap.xml', (_req, res) => res.type('application/xml').send(sitemapXml()));
app.get('/robots.txt', (_req, res) => res.type('text/plain').send(robotsTxt()));

// In production, serve the built React app from the same server (handy for GoDaddy / single Node host).
const clientDist = join(__dirname, '../../client/dist');
if (existsSync(clientDist)) {
  const template = readFileSync(join(clientDist, 'index.html'), 'utf8');
  // Hashed build files never change -> cache for a year; everything else for a day.
  app.use('/assets', express.static(join(clientDist, 'assets'), { immutable: true, maxAge: '365d' }));
  app.use(express.static(clientDist, { index: false, maxAge: '1d' }));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    const known = pageFor(req.path);
    // Tracking result links (/?q=...) contain customer data: keep them out of search results.
    const noindex = !known || 'q' in req.query;
    if (noindex) res.set('X-Robots-Tag', 'noindex');
    res.set('Cache-Control', 'no-cache');
    res.status(known ? 200 : 404).type('html').send(renderPage(template, req.path, { noindex }));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Track My Ship running on http://localhost:${PORT}`);
  const wanted = (process.env.PROVIDERS || 'local,trackcourier').split(',').map((s) => s.trim());
  if (wanted.includes('trackcourier') && !process.env.TRACKCOURIER_API_KEY) {
    console.warn('⚠  TrackCourier.io is OFF: set TRACKCOURIER_API_KEY in server/.env and restart.');
  }
});
