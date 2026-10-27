import { useEffect, useRef, useState } from 'react';
import { trackParcel } from './api.js';
import SEO from './seo-pages.json';
import Logo from './components/Logo.jsx';
import SearchBar from './components/SearchBar.jsx';
import ShipmentList from './components/ShipmentList.jsx';
import ShipmentDetail from './components/ShipmentDetail.jsx';
import HomeContent from './components/HomeContent.jsx';
import InfoPage, { infoPageFor } from './components/InfoPage.jsx';

const clean = (p) => (p.length > 1 ? p.replace(/\/$/, '') : p);

function setNoindex(on) {
  const m = document.querySelector('meta[name="robots"]');
  if (m) m.setAttribute('content', on ? 'noindex, follow' : 'index, follow, max-image-preview:large');
}

// `path` is passed in so the same app renders on the server (server/src/seo.js) and in the browser.
export default function App({ path }) {
  const pathname = clean(path);
  // Courier landing page (e.g. /dtdc-tracking); guide / About / Privacy / Terms pages
  const courierPage = SEO.couriers.find((c) => c.path === pathname) || null;
  const infoPage = infoPageFor(pathname);
  const notFound = pathname !== '/' && !courierPage && !infoPage;
  const PAGE = notFound
    ? { h1: 'Page not found', sub: 'This page does not exist. You can still track your parcel below.' }
    : courierPage
      ? { h1: `${courierPage.name} Tracking`, sub: `Enter your ${courierPage.name} ${courierPage.numberName} (${courierPage.example}) to track it live on a map.` }
      : { h1: SEO.home.h1, sub: SEO.home.sub };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { type, shipments }
  const [selected, setSelected] = useState(null);
  const baseTitle = useRef(null);

  async function search(q, type, courier = '') {
    setLoading(true);
    setError('');
    setResult(null);
    setSelected(null);
    try {
      const data = await trackParcel(q, type, courier);
      // Analytics: what kind of search worked (never the number, phone or email itself)
      window.gtag?.('event', 'track_search', {
        search_type: data.type, courier: courier || 'auto', results: data.shipments.length, found: true,
      });
      setResult(data);
      if (data.shipments.length === 1) setSelected(data.shipments[0]);
      // Shareable link: only for parcel numbers, never put phone/email in the URL.
      const url = new URL(window.location);
      if (['awb', 'lr', 'order'].includes(data.type)) url.searchParams.set('q', q);
      else url.searchParams.delete('q');
      if (courier && !courierPage) url.searchParams.set('courier', courier);
      else url.searchParams.delete('courier');
      window.history.replaceState(null, '', url);
    } catch (e) {
      window.gtag?.('event', 'track_search', { search_type: type, courier: courier || 'auto', results: 0, found: false });
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Support links like /?q=TMS100245781 (e.g. sent in SMS / WhatsApp to customers)
  useEffect(() => {
    if (infoPage) return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) search(q, 'auto', params.get('courier') || courierPage?.slug || '');
  }, []);

  // Tab title shows the parcel being tracked; result pages are kept out of search engines.
  useEffect(() => {
    if (baseTitle.current === null) baseTitle.current = document.title;
    if (selected) document.title = `${selected.awb} – ${selected.statusText} | Track My Ship`;
    else if (result) document.title = `${result.shipments.length} shipments | Track My Ship`;
    else document.title = baseTitle.current;
    if (result) setNoindex(true);
  }, [result, selected]);

  const many = result && result.shipments.length > 1;

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Track My Ship home">
          <Logo size={36} />
          <span className="brand-name">Track My <span>Ship</span></span>
        </a>
        <nav className="top-links" aria-label="Main">
          <a href="/parcel-tracking-guide">Tracking guide</a>
          <a className="help" href="/contact">Need help?</a>
        </nav>
      </header>

      {infoPage ? (
        <main>
          <section className="hero hero--page">
            <h1>{infoPage.h1}</h1>
            <p className="sub">{infoPage.sub}</p>
          </section>
          <InfoPage page={infoPage} />
        </main>
      ) : (
        <main>
          <section className={`hero ${result ? 'hero--compact' : ''}`}>
            {!result && <h1>{PAGE.h1}</h1>}
            {!result && <p className="sub">{PAGE.sub}</p>}
            <SearchBar onSearch={search} loading={loading} defaultCourier={courierPage?.slug || ''} />
            {error && <div className="alert" role="alert">{error}</div>}
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

          {!result && <HomeContent courier={courierPage} />}
        </main>
      )}

      <footer className="foot">
        <div className="foot-brand"><Logo size={20} /> Track My Ship</div>
        <nav className="foot-links" aria-label="Footer">
          <a href="/">Track a parcel</a>
          <a href="/parcel-tracking-guide">Tracking guide</a>
          <a href="/contact">About &amp; Contact</a>
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="/terms">Terms of Use</a>
        </nav>
        <p>
          © {new Date().getFullYear()} Track My Ship · Map data © OpenStreetMap contributors.
          Courier names are trademarks of their owners; Track My Ship is an independent tracking service.
        </p>
      </footer>
    </div>
  );
}
