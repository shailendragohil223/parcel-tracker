import { fmtDate } from '../api.js';
import StatusBadge from './StatusBadge.jsx';

export default function ShipmentList({ shipments, type, onSelect }) {
  return (
    <section className="panel">
      <h2 className="panel-title">
        {shipments.length} shipments found for this {type === 'phone' ? 'mobile number' : type === 'email' ? 'email' : 'search'}
      </h2>
      <ul className="list">
        {shipments.map((s) => (
          <li key={s.awb}>
            <button className="list-item" onClick={() => onSelect(s)}>
              <div>
                <div className="mono">{s.awb}</div>
                <div className="muted">
                  {s.origin?.city} → {s.destination?.city}
                  {s.lrNumber && ` · ${s.lrNumber}`}
                </div>
              </div>
              <div className="list-right">
                <StatusBadge status={s.status} text={s.statusText} />
                <div className="muted small">
                  {s.status === 'DELIVERED' ? 'Delivered' : `ETA ${fmtDate(s.expectedDelivery)}`}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
