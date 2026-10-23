import { useEffect, useState } from 'react';
import { fetchCouriers } from '../api.js';

const TYPES = [
  { id: 'auto', label: 'Any', placeholder: 'AWB, LR no., order ID, mobile or email' },
  { id: 'awb', label: 'Consignment / AWB', placeholder: 'e.g. TMS100245781' },
  { id: 'lr', label: 'LR No.', placeholder: 'e.g. LR-458921' },
  { id: 'order', label: 'Order ID', placeholder: 'e.g. ORD-10045' },
  { id: 'phone', label: 'Mobile', placeholder: '10-digit mobile number' },
  { id: 'email', label: 'Email', placeholder: 'you@example.com' },
];

export default function SearchBar({ onSearch, loading, defaultCourier = '' }) {
  const [type, setType] = useState('auto');
  const [q, setQ] = useState('');
  const [courier, setCourier] = useState(defaultCourier);
  const [couriers, setCouriers] = useState([]);
  const current = TYPES.find((t) => t.id === type);

  // Courier list comes from TrackCourier.io via the server; empty when it's not configured.
  useEffect(() => {
    fetchCouriers().then(setCouriers).catch(() => setCouriers([]));
  }, []);

  const showCourier = couriers.length > 0 && (type === 'awb' || type === 'auto');

  function submit(e) {
    e.preventDefault();
    // On a courier page (e.g. /dtdc-tracking) that courier is used even if the list isn't loaded.
    if (q.trim()) onSearch(q.trim(), type, showCourier ? courier : defaultCourier);
  }

  return (
    <form className="search" onSubmit={submit}>
      <div className="chips" role="tablist">
        {TYPES.map((t) => (
          <button
            type="button"
            key={t.id}
            role="tab"
            aria-selected={type === t.id}
            className={`chip ${type === t.id ? 'chip--on' : ''}`}
            onClick={() => setType(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="search-row">
        {showCourier && (
          <select
            className="courier"
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
            aria-label="Courier"
          >
            <option value="">Our parcel</option>
            {couriers.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        )}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={courier ? 'Courier AWB / tracking number' : current.placeholder}
          inputMode={type === 'phone' ? 'tel' : type === 'email' ? 'email' : 'text'}
          autoComplete="off"
          maxLength={80}
          aria-label="Tracking input"
        />
        <button className="btn" disabled={loading || !q.trim()}>
          {loading ? <span className="spinner" /> : 'Track'}
        </button>
      </div>
    </form>
  );
}
