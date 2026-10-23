// Third-party carrier adapters. Each converts the carrier's response into the
// app's common shipment shape (same as data/shipments.json), so the frontend
// never needs to know which carrier a parcel came from.
//
// NOTE: carrier APIs change their fields from time to time — check each one
// against its current docs when you plug in real keys.
// Carriers generally only search by AWB/tracking number (and Shiprocket by order id);
// phone/email searches go through your own database ("local" provider).

const STATUS_MAP = [
  [/deliver(ed)?$|^dl$/i, 'DELIVERED'],
  [/out for delivery|ofd/i, 'OUT_FOR_DELIVERY'],
  [/rto|return/i, 'RTO'],
  [/exception|undeliver|fail|delay|lost|damage/i, 'EXCEPTION'],
  [/pick(ed)?\s?up|manifest/i, 'PICKED_UP'],
  [/transit|dispatch|hub|connected|in-?transit/i, 'IN_TRANSIT'],
  [/book|created|pending|info ?received/i, 'BOOKED'],
];
export function mapStatus(text = '') {
  for (const [re, s] of STATUS_MAP) if (re.test(text)) return s;
  return 'IN_TRANSIT';
}

// ---------------- Shiprocket ----------------
let srToken = null;
let srTokenAt = 0;
async function shiprocketToken() {
  if (srToken && Date.now() - srTokenAt < 9 * 24 * 3600e3) return srToken; // token valid ~10 days
  const r = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD }),
  });
  const j = await r.json();
  if (!j.token) throw new Error('Shiprocket login failed');
  srToken = j.token;
  srTokenAt = Date.now();
  return srToken;
}

export const shiprocket = {
  name: 'shiprocket',
  enabled: () => !!(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD),
  supports: ['awb', 'order'],
  async findShipments(query, type) {
    const token = await shiprocketToken();
    const path = type === 'order'
      ? `courier/track?order_id=${encodeURIComponent(query)}`
      : `courier/track/awb/${encodeURIComponent(query)}`;
    const r = await fetch(`https://apiv2.shiprocket.in/v1/external/${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return [];
    const j = await r.json();
    const list = Array.isArray(j) ? j.map((x) => Object.values(x)[0]) : [j];
    return list
      .map((x) => x?.tracking_data)
      .filter((td) => td && td.track_status !== 0)
      .map((td) => {
        const t = td.shipment_track?.[0] || {};
        return {
          awb: t.awb_code || query,
          orderId: t.order_id || '',
          carrier: t.courier_name || 'Shiprocket',
          status: mapStatus(t.current_status),
          statusText: t.current_status,
          expectedDelivery: td.etd || t.edd || null,
          origin: { city: t.origin },
          destination: { city: t.destination },
          events: (td.shipment_track_activities || []).map((a) => ({
            time: a.date,
            status: mapStatus(a['sr-status-label'] || a.activity),
            description: a.activity,
            location: a.location,
          })).reverse(),
        };
      });
  },
};

// ---------------- Delhivery ----------------
export const delhivery = {
  name: 'delhivery',
  enabled: () => !!process.env.DELHIVERY_TOKEN,
  supports: ['awb', 'order'],
  async findShipments(query, type) {
    const base = process.env.DELHIVERY_BASE_URL || 'https://track.delhivery.com';
    const param = type === 'order' ? 'ref_ids' : 'waybill';
    const r = await fetch(`${base}/api/v1/packages/json/?${param}=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Token ${process.env.DELHIVERY_TOKEN}` },
    });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.ShipmentData || []).map(({ Shipment: s }) => ({
      awb: s.AWB,
      orderId: s.ReferenceNo || '',
      carrier: 'Delhivery',
      status: mapStatus(s.Status?.Status),
      statusText: s.Status?.Status,
      expectedDelivery: s.ExpectedDeliveryDate || s.PromisedDeliveryDate || null,
      origin: { city: s.Origin },
      destination: { city: s.Destination },
      events: (s.Scans || []).map(({ ScanDetail: d }) => ({
        time: d.ScanDateTime,
        status: mapStatus(d.Scan),
        description: d.Instructions || d.Scan,
        location: d.ScannedLocation,
      })),
    }));
  },
};

// ---------------- TrackCourier.io (Indian couriers: DTDC, Blue Dart, Delhivery, Speed Post, Trackon...) ----------------
// Docs: https://api.trackcourier.io/docs  ·  Free plan: 100 requests/month, 10/minute.
// The courier slug is required on every call (no auto-detect). Slugs: GET /api/couriers.
// Results are cached (TRACKCOURIER_CACHE_MINUTES) so repeated searches don't use up the quota.
const TC_BASE = 'https://api.trackcourier.io/v1';
const tcCache = new Map(); // key -> { at, value }
let tcCouriers = null;
let tcCouriersAt = 0;

const TC_STATE = {
  pending: 'BOOKED', inforeceived: 'BOOKED', pickedup: 'PICKED_UP',
  intransit: 'IN_TRANSIT', outfordelivery: 'OUT_FOR_DELIVERY',
  delivered: 'DELIVERED', exception: 'EXCEPTION', failedattempt: 'EXCEPTION',
  rto: 'RTO', returned: 'RTO',
};
const tcStatus = (state, text) => TC_STATE[String(state || '').toLowerCase().replace(/[^a-z]/g, '')] || mapStatus(text);

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
// "18-Sep-2026" + "17:08" (Indian time) -> ISO string
function tcTime(date = '', time = '') {
  const m = String(date).match(/(\d{1,2})[-\s/]([A-Za-z]{3})[A-Za-z]*[-\s/](\d{2,4})/);
  if (!m) {
    const d = new Date(`${date} ${time}`);
    return isNaN(d) ? null : d.toISOString();
  }
  const [hh = '00', mm = '00'] = String(time).split(':');
  const y = m[3].length === 2 ? `20${m[3]}` : m[3];
  const mon = String(MONTHS[m[2].toLowerCase()] + 1).padStart(2, '0');
  return `${y}-${mon}-${m[1].padStart(2, '0')}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00+05:30`;
}

async function tcGet(path) {
  const r = await fetch(`${TC_BASE}${path}`, { headers: { 'X-API-Key': process.env.TRACKCOURIER_API_KEY } });
  const j = await r.json().catch(() => ({}));
  if (j.usage && j.usage.percent >= 80) console.warn(`[trackcourier] quota ${j.usage.used}/${j.usage.quota} used (${j.usage.plan})`);
  if (!j.success) {
    const code = j.error?.code || `HTTP_${r.status}`;
    if (['TRACKING_NOT_FOUND', 'INVALID_TRACKING_NUMBER'].includes(code)) return null;
    const err = new Error(`${code}: ${j.error?.message || 'TrackCourier request failed'}`);
    err.code = code;
    throw err;
  }
  return j.data;
}

export const trackcourier = {
  name: 'trackcourier',
  enabled: () => !!process.env.TRACKCOURIER_API_KEY,
  supports: ['awb'],
  needsCourier: true,

  // Live scans for one AWB with a known courier slug. Returns a shipment or null.
  async track(awb, courier) {
    if (!courier) return null;
    const key = `${courier}:${String(awb).toUpperCase().replace(/\s/g, '')}`;
    const ttl = (+process.env.TRACKCOURIER_CACHE_MINUTES || 30) * 60e3;
    const hit = tcCache.get(key);
    if (hit && Date.now() - hit.at < ttl) return hit.value;

    const d = await tcGet(`/track?courier=${encodeURIComponent(courier)}&tracking_number=${encodeURIComponent(awb)}`);
    let value = null;
    if (d && !d.CourierHasNoRecordOfShipment && !d.isEmptyTable && d.Checkpoints?.length) {
      const events = d.Checkpoints.map((c) => ({
        time: tcTime(c.Date, c.Time),
        status: tcStatus(c.CheckpointState, c.Activity),
        description: c.Activity,
        // "Jaipur to Delhi" -> show as is, geocode the last place
        location: c.Location,
        geoQuery: c.Location ? `${String(c.Location).split(/\s+to\s+/i).pop()}, India` : undefined,
      })).sort((a, b) => new Date(a.time) - new Date(b.time)); // API returns them unsorted
      value = {
        awb,
        carrier: d.Checkpoints[0].CourierName || courier,
        courier,
        status: tcStatus(d.ShipmentState, d.MostRecentStatus),
        statusText: d.MostRecentStatus,
        origin: null,
        destination: null,
        events,
      };
    }
    tcCache.set(key, { at: Date.now(), value });
    return value;
  },

  async findShipments(query, _type, opts = {}) {
    const s = await this.track(query, opts.courier);
    return s ? [s] : [];
  },

  // Supported couriers (free call, doesn't use quota). Cached for a day.
  async listCouriers() {
    if (tcCouriers && Date.now() - tcCouriersAt < 24 * 3600e3) return tcCouriers;
    const d = await tcGet('/couriers');
    tcCouriers = (d?.couriers || []).sort((a, b) => a.name.localeCompare(b.name));
    tcCouriersAt = Date.now();
    return tcCouriers;
  },
};
