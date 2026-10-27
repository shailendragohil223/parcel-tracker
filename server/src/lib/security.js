// Security settings for the Express server.
import { createHash } from 'node:crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Content-Security-Policy: the browser only runs scripts and loads resources from the
// sources listed here, so injected <script> tags or links to other servers are blocked.
// Inline scripts in index.html (the Google tag) are allowed by their exact SHA-256 hash.
// If you add a new third-party script, add its domains below. The Google AdSense domains
// follow Google's CSP guidance (ads load images from many hosts, so img-src allows https:).
// CSP_REPORT_ONLY=true reports violations in the browser console without blocking.
export function inlineScriptHashes(html) {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`);
}

const ADSENSE_SCRIPTS = [
  'https://pagead2.googlesyndication.com', 'https://tpc.googlesyndication.com', 'https://partner.googleadservices.com',
  'https://www.googletagservices.com', 'https://adservice.google.com', 'https://*.adtrafficquality.google',
  'https://fundingchoicesmessages.google.com', 'https://www.google.com',
];
const ADSENSE_CONNECT = [
  'https://*.googlesyndication.com', 'https://*.doubleclick.net', 'https://adservice.google.com',
  'https://*.adtrafficquality.google', 'https://fundingchoicesmessages.google.com', 'https://www.google.com',
];
const ADSENSE_FRAMES = [
  'https://googleads.g.doubleclick.net', 'https://tpc.googlesyndication.com', 'https://*.googlesyndication.com',
  'https://www.google.com', 'https://*.adtrafficquality.google',
];

export function securityHeaders({ scriptHashes = [] } = {}) {
  const directives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", ...scriptHashes, 'https://*.googletagmanager.com', ...ADSENSE_SCRIPTS],
    connectSrc: ["'self'", 'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com', ...ADSENSE_CONNECT],
    imgSrc: ["'self'", 'data:', 'https:'],
    frameSrc: ADSENSE_FRAMES,
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: [],
  };
  return helmet({
    contentSecurityPolicy: { directives, reportOnly: process.env.CSP_REPORT_ONLY === 'true' },
    // OpenStreetMap map tiles require the site address (Referer); helmet's default
    // "no-referrer" makes OSM answer 403 "Access blocked".
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // HSTS: browsers only ever use HTTPS for this site after the first visit.
    strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
  });
}

// Overall request limit per visitor (pages, files and API), on top of the stricter
// search limit. Static build files are excluded so normal page loads never hit it.
export const generalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/assets/'),
  message: 'Too many requests. Please wait a minute and try again.',
});

// Express 4 does not catch errors thrown inside async route handlers; on Node 22 such an
// error would stop the whole server. Wrap async handlers with this.
export const safe = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Last-resort error handler: log the details on the server, never send them to the visitor.
export function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('[error]', req.method, req.originalUrl.slice(0, 200), err.stack || err);
  if (res.headersSent) return;
  const message = status === 413 ? 'Request too large.' : status === 400 ? 'Bad request.' : 'Something went wrong. Please try again.';
  if (req.path.startsWith('/api/')) return res.status(status).json({ error: message });
  res.status(status).type('text/plain').send(message);
}

// security.txt (RFC 9116): tells security researchers how to report a problem.
export function securityTxt(email, site) {
  const expires = new Date(Date.now() + 180 * 24 * 3600e3).toISOString();
  return `Contact: mailto:${email}\nExpires: ${expires}\nPreferred-Languages: en\nCanonical: ${site}/.well-known/security.txt\n`;
}
