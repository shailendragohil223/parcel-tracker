import './env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { existsSync, readFileSync } from 'node:fs';
import { pageFor, renderPage, sitemapXml, robotsTxt, llmsTxt, adsTxt } from './seo.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import trackRoutes from './routes/track.js';
import { crawlerLog } from './lib/crawlers.js';

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

app.set('trust proxy', 1);
app.use(crawlerLog()); // logs search/AI crawler visits and whether they're genuine

// One address per page: www -> main domain, http -> https (only when the host's proxy says the
// request was plain http, so there is no redirect loop), and no trailing slash.
const SITE_HOST = new URL(process.env.SITE_URL || 'https://trackmyship.co').host;
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const host = req.get('host') || '';
  const wrongHost = host === `www.${SITE_HOST}`;
  const plainHttp = req.get('x-forwarded-proto') === 'http' && host.endsWith(SITE_HOST);
  const slash = req.path.length > 1 && req.path.endsWith('/') && !req.path.startsWith('/api/');
  if (wrongHost || plainHttp || slash) {
    const query = req.originalUrl.slice(req.path.length);
    const path = slash ? req.path.replace(/\/+$/, '') : req.path;
    return res.redirect(301, `https://${SITE_HOST}${path}${query}`);
  }
  next();
});
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

// Crawler files, generated from client/src/seo-pages.json so they always match the site.
const crawlerFile = (type, body) => (_req, res) => {
  if (body() === null) return res.status(404).type('text/plain').send('Not found');
  res.set('Cache-Control', 'public, max-age=3600').type(type).send(body());
};
app.get('/robots.txt', crawlerFile('text/plain', robotsTxt));
app.get('/sitemap.xml', crawlerFile('application/xml', sitemapXml));
app.get('/llms.txt', crawlerFile('text/plain', llmsTxt));
app.get('/ads.txt', crawlerFile('text/plain', adsTxt));

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
