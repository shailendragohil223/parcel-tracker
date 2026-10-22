# Parcel Tracker (React + Node.js)

Customer-facing order / parcel tracking with a live map.
Search by **consignment / AWB number, LR number, order ID, mobile number or email** — the type is detected automatically, or the customer can pick it.

```
parcel-tracker/
├── server/                 Express API
│   ├── src/index.js        app, security headers, rate limit, serves client/dist in production
│   ├── src/routes/track.js GET /api/track?q=…&type=auto|awb|lr|order|phone|email
│   ├── src/lib/detect.js   input type detection, validation, phone/email masking
│   ├── src/lib/geocode.js  location name → lat/lng (OpenStreetMap Nominatim or Google)
│   ├── src/providers/
│   │   ├── local.js        your own shipments (demo JSON → replace with your DB)
│   │   └── carriers.js     Shiprocket, Delhivery, AfterShip adapters
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

Try these demo values:

| Search | Result |
|---|---|
| `SDE100245781` | AWB, in transit Ahmedabad → Bengaluru |
| `LR-458921` or `458921` | same parcel by LR number |
| `9876543210` / `+91 98765 43210` | 2 parcels for that mobile |
| `rahul.mehta@example.com` | 2 parcels for that email |
| `ORD-10052` | out for delivery in Delhi |
| `SDE100245830` | delayed (exception) |

A link like `http://localhost:5173/?q=SDE100245781` opens straight to a parcel — useful in SMS/WhatsApp updates. Phone and email are never put in the URL.

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
PROVIDERS=local,shiprocket,delhivery,aftership
```

| Provider | Searches by | Notes |
|---|---|---|
| Shiprocket | AWB, order ID | email + password of an API user |
| Delhivery | AWB (waybill), order ref | API token from Delhivery One |
| AfterShip | AWB | covers BlueDart, DTDC, Ecom Express, India Post and 1000+ carriers; parcels must be registered with AfterShip first |

Courier APIs change their response fields from time to time — check each adapter in `carriers.js` against the provider's current docs when you plug in real keys. To add another courier, copy one adapter and map its fields to the same shape.

## Maps

- Map tiles: free OpenStreetMap by default. For heavier traffic use a tile provider like MapTiler or Mapbox — set `VITE_MAP_TILE_URL` in `client/.env`.
- Geocoding: `GEOCODER=nominatim` (free, 1 request/second — fine for small volume) or `GEOCODER=google` with `GOOGLE_MAPS_API_KEY`. Best option at scale: store lat/lng for your hubs/branches in the DB so most scans need no lookup.

## Security built in

- Rate limit: 20 searches/minute per IP on `/api/track` (stops people guessing phone numbers).
- Masked phone/email, first name only, no address in the public response.
- Input validation and `helmet` security headers.
- For stricter privacy on phone/email search, add an OTP step before showing results.

## Deploy (single Node server)

```bash
npm run install:all
npm run build           # builds client/dist
npm start               # server serves the API and the React app on PORT
```

Works on any Node host (VPS with PM2, Render, Railway, cPanel "Setup Node.js App" with `server/src/index.js` as the startup file). Set the `.env` values on the host.
