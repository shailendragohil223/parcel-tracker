import { useEffect, useState } from 'react';
import { trackParcel } from './api.js';
import SearchBar from './components/SearchBar.jsx';
import ShipmentList from './components/ShipmentList.jsx';
import ShipmentDetail from './components/ShipmentDetail.jsx';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { type, shipments }
  const [selected, setSelected] = useState(null);

  async function search(q, type, courier = '') {
    setLoading(true);
    setError('');
    setResult(null);
    setSelected(null);
    try {
      const data = await trackParcel(q, type, courier);
      setResult(data);
      if (data.shipments.length === 1) setSelected(data.shipments[0]);
      // Shareable link: only for parcel numbers, never put phone/email in the URL.
      const url = new URL(window.location);
      if (['awb', 'lr', 'order'].includes(data.type)) url.searchParams.set('q', q);
      else url.searchParams.delete('q');
      if (courier) url.searchParams.set('courier', courier);
      else url.searchParams.delete('courier');
      window.history.replaceState(null, '', url);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Support links like /?q=SDE100245781 (e.g. sent in SMS / WhatsApp to customers)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) search(q, 'auto', params.get('courier') || '');
  }, []);

  const many = result && result.shipments.length > 1;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">◆</span> SDE Logistics
        </div>
        <a className="help" href="tel:+910000000000">Need help?</a>
      </header>

      <section className={`hero ${result ? 'hero--compact' : ''}`}>
        {!result && <h1>Where's my parcel?</h1>}
        {!result && <p className="sub">Track with your consignment / AWB number, LR number, order ID, mobile number or email.</p>}
        <SearchBar onSearch={search} loading={loading} />
        {error && <div className="alert">{error}</div>}
      </section>

      {many && !selected && (
        <ShipmentList shipments={result.shipments} type={result.type} onSelect={setSelected} />
      )}

      {selected && (
        <ShipmentDetail
          shipment={selected}
          onBack={many ? () => setSelected(null) : null}
        />
      )}

      <footer className="foot">© {new Date().getFullYear()} SDE Logistics · Map data © OpenStreetMap contributors</footer>
    </div>
  );
}
