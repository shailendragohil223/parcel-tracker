import { Router } from 'express';
import * as local from '../providers/local.js';
import { shiprocket, delhivery, aftership } from '../providers/carriers.js';
import { detectType, validate, normalize, maskPhone, maskEmail } from '../lib/detect.js';
import { enrichWithCoords } from '../lib/geocode.js';

const ALL = {
  local: { ...local, enabled: () => true, supports: ['awb', 'lr', 'order', 'phone', 'email'] },
  shiprocket,
  delhivery,
  aftership,
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

// GET /api/track?q=SDE100245781&type=auto
// type: auto | awb | lr | order | phone | email
router.get('/track', async (req, res) => {
  const q = normalize(req.query.q);
  const type = detectType(q, req.query.type);
  const err = validate(q, type);
  if (err) return res.status(400).json({ error: err });

  const providers = activeProviders().filter((n) => ALL[n].supports.includes(type));
  const settled = await Promise.allSettled(providers.map((n) => ALL[n].findShipments(q, type)));

  const seen = new Set();
  const found = [];
  settled.forEach((r, i) => {
    if (r.status === 'rejected') return console.warn(`[${providers[i]}]`, r.reason?.message);
    for (const s of r.value) {
      if (seen.has(s.awb)) continue;
      seen.add(s.awb);
      found.push(s);
    }
  });

  const shipments = await Promise.all(found.map((s) => enrichWithCoords(structuredClone(s))));
  shipments.sort((a, b) => new Date(b.events.at(-1)?.time || 0) - new Date(a.events.at(-1)?.time || 0));

  if (!shipments.length) {
    return res.status(404).json({ type, error: 'No shipment found. Please check the number and try again.' });
  }
  res.json({ type, count: shipments.length, shipments: shipments.map(toPublic) });
});

router.get('/health', (_req, res) => res.json({ ok: true, providers: activeProviders() }));

export default router;
