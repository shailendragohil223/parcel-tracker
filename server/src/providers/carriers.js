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

// ---------------- AfterShip (1000+ carriers: BlueDart, DTDC, Ecom, India Post...) ----------------
export const aftership = {
  name: 'aftership',
  enabled: () => !!process.env.AFTERSHIP_API_KEY,
  supports: ['awb'],
  async findShipments(query) {
    const r = await fetch(
      `https://api.aftership.com/tracking/2024-10/trackings?tracking_numbers=${encodeURIComponent(query)}`,
      { headers: { 'as-api-key': process.env.AFTERSHIP_API_KEY } }
    );
    if (!r.ok) return [];
    const j = await r.json();
    return (j.data?.trackings || []).map((t) => ({
      awb: t.tracking_number,
      orderId: t.order_id || '',
      carrier: t.slug,
      status: mapStatus(t.tag),
      statusText: t.subtag_message || t.tag,
      expectedDelivery: t.courier_estimated_delivery_date?.estimated_delivery_date || t.expected_delivery || null,
      origin: { city: t.origin_city || t.origin_country_region },
      destination: { city: t.destination_city || t.destination_country_region },
      events: (t.checkpoints || []).map((c) => ({
        time: c.checkpoint_time,
        status: mapStatus(c.tag),
        description: c.message,
        location: c.location || [c.city, c.state].filter(Boolean).join(', '),
        ...(c.coordinate?.latitude ? { lat: c.coordinate.latitude, lng: c.coordinate.longitude } : {}),
      })),
    }));
  },
};
