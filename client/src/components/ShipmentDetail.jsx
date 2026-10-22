import { fmtDate, fmtDateTime } from '../api.js';
import StatusBadge from './StatusBadge.jsx';
import TrackingMap from './TrackingMap.jsx';

const STEPS = [
  ['BOOKED', 'Booked'],
  ['PICKED_UP', 'Picked up'],
  ['IN_TRANSIT', 'In transit'],
  ['OUT_FOR_DELIVERY', 'Out for delivery'],
  ['DELIVERED', 'Delivered'],
];

function stepIndex(status) {
  if (status === 'EXCEPTION' || status === 'RTO') return 2;
  return Math.max(0, STEPS.findIndex(([s]) => s === status));
}

export default function ShipmentDetail({ shipment: s, onBack }) {
  const idx = stepIndex(s.status);
  const events = [...s.events].reverse(); // newest first

  return (
    <section className="detail">
      {onBack && <button className="link" onClick={onBack}>← All shipments</button>}

      <div className="panel summary">
        <div className="summary-head">
          <div>
            <div className="label">Consignment / AWB</div>
            <div className="awb mono">{s.awb}</div>
          </div>
          <StatusBadge status={s.status} text={s.statusText} />
        </div>

        <div className="route">
          <div>
            <div className="label">From</div>
            <div className="city">{s.origin?.city || '—'}</div>
          </div>
          <div className="route-line" aria-hidden />
          <div className="right">
            <div className="label">To</div>
            <div className="city">{s.destination?.city || '—'}</div>
          </div>
        </div>

        <ol className={`steps ${s.status === 'EXCEPTION' ? 'steps--warn' : ''}`}>
          {STEPS.map(([key, label], i) => (
            <li key={key} className={i < idx ? 'done' : i === idx ? 'now' : ''}>
              <span className="dot" />
              <span className="step-label">{label}</span>
            </li>
          ))}
        </ol>

        <dl className="facts">
          <div><dt>{s.status === 'DELIVERED' ? 'Delivered on' : 'Expected delivery'}</dt>
            <dd>{s.status === 'DELIVERED' ? fmtDate(s.currentLocation?.time) : fmtDate(s.expectedDelivery)}</dd></div>
          {s.lrNumber && <div><dt>LR number</dt><dd className="mono">{s.lrNumber}</dd></div>}
          {s.orderId && <div><dt>Order ID</dt><dd className="mono">{s.orderId}</dd></div>}
          <div><dt>Carrier</dt><dd>{s.carrier}{s.mode ? ` · ${s.mode}` : ''}</dd></div>
          {s.pieces && <div><dt>Pieces / weight</dt><dd>{s.pieces} pcs{s.weightKg ? ` · ${s.weightKg} kg` : ''}</dd></div>}
          {s.receiver && <div><dt>Receiver</dt><dd>{s.receiver}{s.phone ? ` · ${s.phone}` : ''}</dd></div>}
        </dl>
      </div>

      <div className="grid">
        <div className="panel map-panel">
          <TrackingMap shipment={s} />
        </div>

        <div className="panel">
          <h3 className="panel-title">Tracking history</h3>
          <ol className="timeline">
            {events.map((e, i) => (
              <li key={i} className={i === 0 ? 'latest' : ''}>
                <div className="t-time">{fmtDateTime(e.time)}</div>
                <div className="t-desc">{e.description}</div>
                <div className="t-loc">{e.location}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
