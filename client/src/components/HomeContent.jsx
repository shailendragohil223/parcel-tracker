import SEO from '../seo-pages.json';

// Visible content for the home and courier pages: helps customers and gives
// search engines real text (how it works, supported couriers, FAQ).
export default function HomeContent({ courier }) {
  return (
    <div className="home-content">
      <section className="panel">
        <h2 className="panel-title">How to track your parcel</h2>
        <ol className="how">
          <li>
            <b>Enter your number</b>
            <span>{courier ? `Your ${courier.name} AWB / consignment number.` : 'AWB / consignment number, LR number, order ID, mobile number or email.'}</span>
          </li>
          <li>
            <b>Press Track</b>
            <span>We fetch the latest scans{courier ? ` from ${courier.name}` : ' from the courier'} in seconds.</span>
          </li>
          <li>
            <b>See it on the map</b>
            <span>Current location, full tracking history and expected delivery date.</span>
          </li>
        </ol>
      </section>

      <section className="panel">
        <h2 className="panel-title">Track parcels from popular couriers</h2>
        <ul className="courier-links">
          {SEO.couriers.map((c) => (
            <li key={c.slug}>
              <a href={c.path} aria-current={courier?.slug === c.slug ? 'page' : undefined}>{c.name} tracking</a>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2 className="panel-title">Frequently asked questions</h2>
        <div className="faq">
          {SEO.faq.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
