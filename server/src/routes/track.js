import { Router } from 'express';
import * as local from '../providers/local.js';
import { shiprocket, delhivery, trackcourier } from '../providers/carriers.js';
import { detectType, validate, normalize, maskPhone, maskEmail } from '../lib/detect.js';
import { enrichWithCoords } from '../lib/geocode.js';

const ALL = {
  local: { ...local, enabled: () => true, supports: ['awb', 'lr', 'order', 'phone', 'email'] },
  shiprocket,
  delhivery,
  trackcourier,
};

const STATUS_TEXT = {
  BOOKED: 'Booked',
  PICKED_UP: 'Picked up',
  IN_TRANSIT: 'In transit',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  EXCEPTION: 'Delayed / Exception',
  RTO: 'Returning to origin',
};

function activeProviders() {
  return (process.env.PROVIDERS || 'local')
    .split(',')
    .map((s) => s.trim())
    .filter((n) => ALL[n] && ALL[n].enabled());
}

// Parcels in your DB that were sent through an outside courier (courierSlug + awb)
// get their latest scans from TrackCourier.io. Your own fields (LR, order, origin,
// destination, ETA) are kept; live scans replace the stored ones when they're newer.
async function refreshFromTrackCourier(s) {
  if (!s.courierSlug || s.status === 'DELIVERED' || !activeProviders().includes('trackcourier')) return s;
  try {
    const live = await trackcourier.track(s.courierAwb || s.awb, s.courierSlug);
    if (!live) return s;
    const lastStored = new Date(s.events.at(-1)?.time || 0);
    const lastLive = new Date(live.events.at(-1)?.time || 0);
    if (lastLive >= lastStored) {
      // keep our own booking scans from before the courier's first scan
      const firstLive = new Date(live.events[0]?.time || 0);
      s.events = [...s.events.filter((e) => new Date(e.time) < firstLive), ...live.events];
      s.status = live.status;
      s.statusText = live.statusText;
    }
  } catch (e) {
    console.warn('[trackcourier]', e.message); // fall back to stored scans
  }
  return s;
}

// What the public API is allowed to return (no full phone/email).
function toPublic(s) {
  const events = [...(s.events || [])].sort((a, b) => new Date(a.time) - new Date(b.time));
  const last = events[events.length - 1];
  return {
    awb: s.awb,
    lrNumber: s.lrNumber || null,
    orderId: s.orderId || null,
    carrier: s.carrier,
    mode: s.mode || null,
    pieces: s.pieces || null,
    weightKg: s.weightKg || null,
    status: s.status,
    statusText: STATUS_TEXT[s.status] || s.statusText || s.status,
    expectedDelivery: s.expectedDelivery || null,
    receiver: s.customerName ? s.customerName.split(' ')[0] : null,
    phone: maskPhone(s.phone),
    email: maskEmail(s.email),
    origin: s.origin || null,
    destination: s.destination || null,
    currentLocation: last ? { location: last.location, lat: last.lat, lng: last.lng, time: last.time } : null,
    events,
  };
}

const router = Router();

// GET /api/track?q=SDE100245781&type=auto[&courier=dtdc]
// type: auto | awb | lr | order | phone | email
// courier: TrackCourier.io slug — only needed for parcels that are NOT in your own database.
router.get('/track', async (req, res) => {
  const q = normalize(req.query.q);
  const courier = String(req.query.courier || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
  const type = courier ? 'awb' : detectType(q, req.query.type);
  const err = validate(q, type);
  if (err) return res.status(400).json({ error: err });

  const providers = activeProviders().filter(
    (n) => ALL[n].supports.includes(type) && (!ALL[n].needsCourier || courier)
  );
  const settled = await Promise.allSettled(providers.map((n) => ALL[n].findShipments(q, type, { courier })));

  const seen = new Set();
  const found = [];
  let quotaHit = false;
  settled.forEach((r, i) => {
    if (r.status === 'rejected') {
      if (r.reason?.code === 'QUOTA_EXCEEDED') quotaHit = true;
      return console.warn(`[${providers[i]}]`, r.reason?.message);
    }
    for (const s of r.value) {
      const key = String(s.awb).toUpperCase();
      if (seen.has(key)) continue; // first provider wins (local is listed first)
      seen.add(key);
      found.push(s);
    }
  });

  const shipments = await Promise.all(
    found.map(async (s) => enrichWithCoords(await refreshFromTrackCourier(structuredClone(s))))
  );
  shipments.sort((a, b) => new Date(b.events.at(-1)?.time || 0) - new Date(a.events.at(-1)?.time || 0));

  if (!shipments.length) {
    if (quotaHit) return res.status(503).json({ type, error: 'Live courier tracking is temporarily unavailable. Please try again later.' });
    const hint = !courier && type === 'awb' && activeProviders().includes('trackcourier')
      ? ' If it was sent by another courier, choose the courier and try again.' : '';
    return res.status(404).json({ type, error: `No shipment found. Please check the number and try again.${hint}` });
  }
  res.json({ type, count: shipments.length, shipments: shipments.map(toPublic) });
});

// GET /api/couriers -> [{ slug, name }] for the courier picker (empty if TrackCourier.io is off)
router.get('/couriers', async (_req, res) => {
  if (!activeProviders().includes('trackcourier')) return res.json({ couriers: [] });
  try {
    res.json({ couriers: await trackcourier.listCouriers() });
  } catch (e) {
    console.warn('[trackcourier]', e.message);
    res.json({ couriers: [] });
  }
});

router.get('/health', (_req, res) => res.json({ ok: true, providers: activeProviders() }));

export default router;
