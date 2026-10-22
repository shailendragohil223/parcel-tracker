import { useState } from 'react';

const TYPES = [
  { id: 'auto', label: 'Any', placeholder: 'AWB, LR no., order ID, mobile or email' },
  { id: 'awb', label: 'Consignment / AWB', placeholder: 'e.g. SDE100245781' },
  { id: 'lr', label: 'LR No.', placeholder: 'e.g. LR-458921' },
  { id: 'order', label: 'Order ID', placeholder: 'e.g. ORD-10045' },
  { id: 'phone', label: 'Mobile', placeholder: '10-digit mobile number' },
  { id: 'email', label: 'Email', placeholder: 'you@example.com' },
];

export default function SearchBar({ onSearch, loading }) {
  const [type, setType] = useState('auto');
  const [q, setQ] = useState('');
  const current = TYPES.find((t) => t.id === type);

  function submit(e) {
    e.preventDefault();
    if (q.trim()) onSearch(q.trim(), type);
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
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={current.placeholder}
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
