import SEO from '../seo-pages.json';
import { courierFaq } from '../courier-faq.js';
import AdSlot from './AdSlot.jsx';

function CourierAnswer({ courier: c }) {
  return (
    <section className="panel" aria-labelledby="courier-how">
      <h2 className="panel-title" id="courier-how">How to track a {c.name} parcel</h2>
      <p className="answer">
        Enter your {c.name} {c.numberName} above and press <b>Track</b>. The {c.numberName} is {c.format}. You'll see
        the current status, every scan with date, time and place, and the parcel's route on a map.
      </p>
      <dl className="faq-list">
        {courierFaq(c).slice(1).map((f) => (
          <div key={f.q}>
            <dt>{f.q}</dt>
            <dd>
              {f.a}
              {f.q.startsWith('Who do I contact') && c.officialUrl && (
                <> Official website: <a href={c.officialUrl} target="_blank" rel="noopener noreferrer">{c.officialUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a>.</>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="muted small">
        Track My Ship is an independent tracking service, not affiliated with {c.name}. See the{' '}
        <a href="/parcel-tracking-guide#statuses">guide to tracking statuses</a> for what each update means.
      </p>
    </section>
  );
}

// Short introduction on the home page: what Track My Ship is, in plain words.
function HomeIntro() {
  const top = SEO.couriers.slice(0, 4);
  return (
    <section className="panel" aria-labelledby="about-tms">
      <h2 className="panel-title" id="about-tms">Online courier tracking for India</h2>
      <p className="answer">
        Track My Ship is a free parcel and shipment tracking website. Enter the AWB or consignment number from your
        booking receipt or the seller's shipping message, and see where your parcel is — the latest status, every scan
        with date and place, and the route on a map. No sign-up is needed.
      </p>
      <p className="muted small">
        Popular courier tracking pages:{' '}
        {top.map((c, i) => (
          <span key={c.slug}>{i > 0 && ' · '}<a href={c.path}>{c.name} tracking</a></span>
        ))}. Track My Ship is an independent tracking website, not a courier company.
      </p>
    </section>
  );
}

// Visible content for the home and courier pages: how it works, supported couriers, FAQ.
export default function HomeContent({ courier }) {
  return (
    <div className="home-content">
      {courier ? <CourierAnswer courier={courier} /> : <HomeIntro />}

      <section className="panel" aria-labelledby="how">
        <h2 className="panel-title" id="how">How to track your parcel</h2>
        <ol className="how">
          <li>
            <b>Enter your number</b>
            <span>{courier ? `Your ${courier.name} ${courier.numberName}.` : 'The courier tracking (AWB / consignment) number from your receipt or the seller\'s SMS or email.'}</span>
          </li>
          <li>
            <b>Press Track</b>
            <span>{courier ? `We fetch the latest scans published by ${courier.name}.` : 'The courier is detected from the number, or choose it from the list.'}</span>
          </li>
          <li>
            <b>See it on the map</b>
            <span>Current location, full tracking history and expected delivery date.</span>
          </li>
        </ol>
        <p className="muted small">
          Not sure which number you have? Read the <a href="/parcel-tracking-guide">parcel tracking guide</a>.
        </p>
      </section>

      <AdSlot />

      <section className="panel" aria-labelledby="couriers">
        <h2 className="panel-title" id="couriers">Track parcels from popular couriers</h2>
        <ul className="courier-links">
          {SEO.couriers.map((c) => (
            <li key={c.slug}>
              <a href={c.path} aria-current={courier?.slug === c.slug ? 'page' : undefined}>{c.name} tracking</a>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="faq">
        <h2 className="panel-title" id="faq">Frequently asked questions</h2>
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
