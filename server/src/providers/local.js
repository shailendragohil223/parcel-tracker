// "local" provider = your own shipment database.
// Demo uses a JSON file; swap findShipments() for a MongoDB / MySQL query in production.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { normalizePhone } from '../lib/detect.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const shipments = JSON.parse(readFileSync(join(__dirname, '../data/shipments.json'), 'utf8'));

const clean = (s) => String(s).toUpperCase().replace(/[\s-]/g, '');

export const name = 'local';

export async function findShipments(query, type) {
  switch (type) {
    case 'phone': {
      const p = normalizePhone(query);
      return shipments.filter((s) => normalizePhone(s.phone) === p);
    }
    case 'email':
      return shipments.filter((s) => s.email.toLowerCase() === query.toLowerCase());
    case 'lr':
      return shipments.filter((s) => clean(s.lrNumber) === clean(query));
    case 'order':
      return shipments.filter((s) => clean(s.orderId) === clean(query));
    default: // awb / consignment — also try LR and order id in case user typed without prefix
      return shipments.filter((s) =>
        [s.awb, s.lrNumber, s.orderId].some((v) => clean(v) === clean(query) || clean(v).endsWith(clean(query)) && clean(query).length >= 6)
      );
  }
}
