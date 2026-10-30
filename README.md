# Track My Ship (React + Node.js)

Customer-facing order / parcel tracking with a live map.
**Live site (trackmyship.co): a tracking-only website.** Visitors enter a courier tracking (AWB / consignment) number; the courier is detected from the number or picked from a list, and live scans come from TrackCourier.io. Track My Ship does not book or deliver parcels.

The code also contains an optional "own shipments" database (`server/src/providers/local.js`) that supports search by LR number, order ID, mobile or email. It is **off unless `DEMO_SHIPMENTS=true`** and currently only holds demo data for local testing — never enable it on the live site with demo data.

```
parcel-tracker/
├── server/                 Express API
│   ├── src/index.js        app, security headers, rate limit, serves client/dist in production
│   ├── src/routes/track.js GET /api/track?q=…&type=auto|awb|lr|order|phone|email
│   ├── src/lib/detect.js   input type detection, validation, phone/email masking
│   ├── src/lib/geocode.js  location name → lat/lng (OpenStreetMap Nominatim or Google)
│   ├── src/providers/
│   │   ├── local.js        your own shipments (demo JSON → replace with your DB)
│   │   └── carriers.js     Shiprocket, Delhivery, TrackCourier.io adapters
│   └── src/data/shipments.json   demo data
└── client/                 React (Vite) + Leaflet map
    └── src/components/     SearchBar, ShipmentList, ShipmentDetail, TrackingMap, StatusBadge
```

## Run locally

Needs Node.js 18+.

```bash
npm run install:all
cp server/.env.example server/.env
npm run dev:server      # API on http://localhost:5000
npm run dev:client      # app on http://localhost:5173 (in a second terminal)
```

Try these demo values (needs `DEMO_SHIPMENTS=true` in `server/.env`):

| Search | Result |
|---|---|
| `TMS100245781` | AWB, in transit Ahmedabad → Bengaluru |
| `LR-458921` or `458921` | same parcel by LR number |
| `9876543210` / `+91 98765 43210` | 2 parcels for that mobile |
| `rahul.mehta@example.com` | 2 parcels for that email |
| `ORD-10052` | out for delivery in Delhi |
| `TMS100245830` | delayed (exception) |
| `LR-459150` | sent via DTDC — live scans from TrackCourier.io when a key is set |

A link like `http://localhost:5173/?q=TMS100245781` opens straight to a parcel — useful in SMS/WhatsApp updates. Phone and email are never put in the URL.

## How tracking works

1. `detect.js` decides the type: email → `email`, 10-digit Indian mobile (with/without +91/0) → `phone`, starts with `LR` → `lr`, starts with `ORD` → `order`, anything else → `awb`.
2. Every provider listed in `PROVIDERS` that supports that type is queried in parallel; results are merged and de-duplicated by AWB.
3. Scan locations without coordinates are geocoded (and cached) so they appear on the map.
4. The response masks phone (`98******10`) and email (`ra*****@example.com`) and only shows the receiver's first name.

Phone/email search only works against **your own database** — courier APIs don't offer it. So save every booking (with the customer's phone, email, LR number and the courier's AWB) in your DB, and the carrier adapters fill in live scans by AWB.

## Connect your real data

**Your database** — replace `findShipments()` in `server/src/providers/local.js` with a query. Keep the same returned shape as `shipments.json`. Example with MongoDB:

```js
case 'phone': return Shipment.find({ phone: normalizePhone(query) }).lean();
```

**Courier APIs** — add keys in `server/.env` and list them:

```
PROVIDERS=local,shiprocket,delhivery,trackcourier
```

| Provider | Searches by | Notes |
|---|---|---|
| Shiprocket | AWB, order ID | email + password of an API user |
| Delhivery | AWB (waybill), order ref | API token from Delhivery One |
| TrackCourier.io | AWB + courier | DTDC, Blue Dart, Delhivery, Speed Post, Trackon, Professional and other Indian couriers. Free plan: 100 requests/month, 10/minute |

### TrackCourier.io

TrackCourier.io needs the courier name with every lookup (it can't guess it from the number), and the free plan allows 100 lookups a month. It's used in two ways:

1. **Parcels in your database sent by an outside courier.** Save `courierSlug` (e.g. `dtdc`) and, if different from your own number, `courierAwb` on the shipment. When a customer searches by your AWB, LR, order ID, phone or email, the server fetches the courier's latest scans and merges them in. Delivered parcels are never re-checked. See `TMS100245870` in `shipments.json` (search `LR-459150`).
2. **Any courier number.** When `trackcourier` is enabled, a courier drop-down appears beside the search box. Picking e.g. "DTDC" and entering their number tracks it directly.

Every result is cached for `TRACKCOURIER_CACHE_MINUTES` (default 30), so repeat searches don't use quota. The courier list (`GET /api/couriers`) is free. A warning is logged when 80% of the monthly quota is used; if it runs out, parcels in your database still show their stored scans. On the free plan, a phone search that finds several courier parcels uses one request per parcel — upgrade or raise the cache time if traffic grows.

Courier APIs change their response fields from time to time — check each adapter in `carriers.js` against the provider's current docs when you plug in real keys. To add another courier, copy one adapter and map its fields to the same shape.

## Maps

- Map tiles: free OpenStreetMap by default. For heavier traffic use a tile provider like MapTiler or Mapbox — set `VITE_MAP_TILE_URL` in `client/.env`.
- Geocoding: `GEOCODER=nominatim` (free, 1 request/second — fine for small volume) or `GEOCODER=google` with `GOOGLE_MAPS_API_KEY`. Best option at scale: store lat/lng for your hubs/branches in the DB so most scans need no lookup.

## Branding & SEO

- Logo: `client/public/logo.svg` (full), `logo-mark.svg` (icon); favicons, app icons and `og-image.png` (link previews on WhatsApp, Facebook, LinkedIn, X) in the same folder. In the app it's `client/src/components/Logo.jsx`.
- Page titles, descriptions, courier pages and FAQ all come from `client/src/seo-pages.json` — edit there.
- The server (`server/src/seo.js`) sends every page with its own title, description, canonical link, social tags, structured data (Organization, site search box, FAQ, breadcrumbs) and readable text for search engines, and serves `/sitemap.xml` and `/robots.txt`.
- Courier landing pages for search traffic: `/dtdc-tracking`, `/bluedart-tracking`, `/delhivery-tracking`, `/speed-post-tracking` and more.
- Tracking result links (`/?q=…`) and the API are marked `noindex` so customers' parcels never appear in Google. Unknown pages return 404.
- After going live: add the site in Google Search Console and submit `https://trackmyship.co/sitemap.xml`.
- **Server-side rendering:** `npm run build` also builds `client/dist-ssr`; the server renders every page's full HTML so crawlers that don't run JavaScript (incl. AI search bots) see all content, and the browser hydrates it.
- **Crawler files** (generated from `seo-pages.json`; copies are saved in `client/public/` by `scripts/generate-crawler-files.mjs`, which GitHub runs and commits automatically): `/robots.txt` (OAI-SearchBot allowed, `/api/` blocked; set `AI_TRAINING_CRAWLERS=block` to disallow GPTBot, Google-Extended, CCBot and ClaudeBot), `/sitemap.xml` (uses each page's `updated` date — change it when you edit a page), `/llms.txt`, `/ads.txt` (AdSense).
- **Crawler logging:** visits from Googlebot, bingbot, OAI-SearchBot, GPTBot, ChatGPT-User, Claude-SearchBot, ClaudeBot, Claude-User, PerplexityBot and Perplexity-User are logged as `[crawler] {...,"verified":true|false|null}` — verified against each operator's published IP list (Google/Bing: reverse DNS). User-agent alone is never trusted. `CRAWLER_LOG=off` disables it.
- **Check the site:** `python3 scripts/check_site.py https://trackmyship.co` tests robots/sitemap/status codes/canonicals/JSON-LD/links like a crawler; GitHub runs it with `--browser` on every change.

## Blog

Posts live in `client/src/blog/`. To add one:

1. Write the post as `client/src/blog/<slug>.md` (lower-case words joined by hyphens, e.g. `cod-parcel-refund.md`).
   Supported formatting: `## Heading`, `### Subheading`, `> In short: …` (highlighted answer, put it first),
   `- lists`, `1. lists`, tables with `|`, `**bold**`, `[links](/dtdc-tracking)` and `[ad]` for an AdSense unit.
2. Add an entry to `client/src/blog/posts.json` with `slug`, `h1`, `title` (under ~60 characters),
   a unique `description` (120–160 characters) and the `published` / `updated` dates.
3. Push and redeploy. The post appears at `/blog/<slug>`, in the blog list, on the home page,
   in `sitemap.xml`, the RSS feed (`/blog/rss.xml`), `llms.txt` and the structured data (BlogPosting).

## Security built in

- Rate limit: 20 searches/minute per IP on `/api/track` (stops people guessing phone numbers).
- Masked phone/email, first name only, no address in the public response.
- Input validation and `helmet` security headers.
- For stricter privacy on phone/email search, add an OTP step before showing results.

## Deploy (single Node server)

```bash
npm start
```

`npm start` (`scripts/start.mjs`) installs the server packages and builds the React app **only if they're missing**, then starts the server, which serves both the API and the website on `PORT`. So it works on hosts that don't run `npm install` or a build step themselves, such as GoDaddy. The first start takes a minute or two; later restarts are instant while the files are kept.

**GoDaddy:** deploy the repo with start command `npm start`. Add the settings from `server/.env.example` as environment variables in the GoDaddy panel (at least `TRACKCOURIER_API_KEY`); `.env` files are not in GitHub. The host sets `PORT` itself.

**VPS / PM2 / Render / Railway:** same `npm start`, or run `npm run install:all && npm run build` during the build step for faster starts.
