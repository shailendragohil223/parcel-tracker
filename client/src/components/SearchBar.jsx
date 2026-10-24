import { useEffect, useState } from 'react';
import { fetchCouriers } from '../api.js';

// One box for the courier tracking (AWB / consignment) number. The courier is detected from the
// number's format when possible; otherwise the visitor picks it from the list.
export default function SearchBar({ onSearch, loading, defaultCourier = '' }) {
  const [q, setQ] = useState('');
  const [courier, setCourier] = useState(defaultCourier);
  const [couriers, setCouriers] = useState([]);

  // Courier list comes from TrackCourier.io via the server; empty when it's not configured.
  useEffect(() => {
    fetchCouriers().then(setCouriers).catch(() => setCouriers([]));
  }, []);

  function submit(e) {
    e.preventDefault();
    if (q.trim()) onSearch(q.trim(), 'auto', courier || defaultCourier);
  }

  return (
    <form className="search" onSubmit={submit} role="search">
      <div className="search-row">
        {couriers.length > 0 && (
          <select
            className="courier"
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
            aria-label="Courier"
          >
            <option value="">Detect courier</option>
            {couriers.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        )}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Courier tracking / AWB number"
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
