import SEO from '../seo-pages.json';
import AdSlot from './AdSlot.jsx';
import { POSTS, postPath } from '../blog/index.js';

const PAGE = SEO.pages.find((p) => p.path === '/parcel-tracking-guide');
const fmt = (d) => new Date(`${d}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
const official = SEO.couriers.filter((c) => c.officialUrl);
const host = (u) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

// Plain-language explainer. Each section opens with a direct answer, then details.
// Statuses match the labels shown in the tracker (StatusBadge / progress steps).
export default function GuidePage() {
  return (
    <>
      <p className="muted">
        By Track My Ship · Published {fmt(PAGE.published)} · Last updated {fmt(PAGE.updated)}
      </p>

      <nav className="toc" aria-label="On this page">
        <b>On this page:</b>{' '}
        <a href="#tracking-numbers">Tracking numbers</a> · <a href="#find-number">Find your AWB</a> ·{' '}
        <a href="#no-number">No tracking number</a> · <a href="#which-courier">Which courier</a> ·{' '}
        <a href="#statuses">Status meanings</a> · <a href="#no-information">No information</a> ·{' '}
        <a href="#not-updating">Not updating</a> · <a href="#delayed">Delayed or failed delivery</a>
      </nav>

      <p className="answer">
        <b>In short:</b> every courier parcel gets a unique tracking number when it is booked — called an AWB,
        consignment, waybill or docket number depending on the courier. Enter it on the <a href="/">tracker</a> to see
        where the parcel is. Track My Ship is a tracking website, not a courier: for delivery problems, contact the courier
        or the sender.
      </p>

      <h2 id="tracking-numbers">What is a courier tracking number?</h2>
      <p>
        It is the reference a courier gives a shipment at booking. Every scan of the parcel — at pickup, at each hub and at
        delivery — is recorded against it, which is what lets you track the parcel. Different names are used for the same
        idea:
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th scope="col">Name</th><th scope="col">What it is</th><th scope="col">Who gives it</th></tr>
          </thead>
          <tbody>
            <tr><td><b>AWB number</b></td><td>"Air waybill" number. Most express couriers use the term for every shipment, not only air.</td><td>The courier, at booking</td></tr>
            <tr><td><b>Consignment / docket number</b></td><td>The courier's reference for your shipment, printed on the booking receipt.</td><td>The courier, at booking</td></tr>
            <tr><td><b>Waybill number</b></td><td>Another name for the tracking number, used by couriers such as Delhivery.</td><td>The courier, at booking</td></tr>
            <tr><td><b>Speed Post article number</b></td><td>13 characters: 2 letters, 9 digits, 2 letters ending in IN (for example EE123456789IN).</td><td>India Post, at booking</td></tr>
            <tr><td><b>LR number</b></td><td>"Lorry receipt" number for goods sent by road transport (trucks). It is tracked on the transporter's own website — Track My Ship does not track LR numbers.</td><td>The transporter, at booking</td></tr>
            <tr><td><b>Order ID</b></td><td>The shop's number for your purchase, not a courier tracking number. The seller's order page usually shows the courier and its tracking number.</td><td>The seller</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="find-number">How do I find my AWB number?</h2>
      <p className="answer">Look on the booking receipt if you sent the parcel, or in the seller's shipping SMS, email or order page if you bought something online.</p>
      <ul>
        <li><b>You sent the parcel:</b> it is printed on the receipt the courier counter or pickup agent gave you.</li>
        <li><b>You bought something online:</b> open the order in the seller's website or app, or find the "shipped" SMS or email. It usually names the courier and shows the tracking number.</li>
        <li><b>Someone sent you a parcel:</b> ask the sender for the courier's name and the number on their receipt.</li>
      </ul>

      <h2 id="no-number">Can I track a parcel without a tracking number?</h2>
      <p className="answer">
        Not on Track My Ship. Tracking works with the courier's tracking number, so you first need to get it from the
        seller or the sender as described above.
      </p>
      <p>
        If you only have an order ID, track the order on the seller's website or app. Track My Ship does not offer tracking
        by mobile number or email.
      </p>

      <h2 id="which-courier">How do I know which courier has my parcel?</h2>
      <p className="answer">
        The seller's shipping message or the sender's receipt names the courier. On Track My Ship you can also just enter
        the number: the courier is detected automatically for common formats.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th scope="col">Courier</th><th scope="col">Typical tracking number format</th></tr>
          </thead>
          <tbody>
            <tr><td>DTDC</td><td>One letter followed by 8–10 digits, e.g. C1002935719</td></tr>
            <tr><td>Blue Dart</td><td>11 digits</td></tr>
            <tr><td>Delhivery</td><td>13 or 14 digits</td></tr>
            <tr><td>Speed Post (India Post)</td><td>2 letters, 9 digits, 2 letters ending in IN, e.g. EE123456789IN</td></tr>
          </tbody>
        </table>
      </div>
      <p className="muted small">
        These are common patterns seen on these couriers' numbers, not official rules; other couriers' numbers can look
        similar. If the courier isn't detected, choose it from the list next to the search box.
      </p>

      <h2 id="statuses">What do tracking statuses mean?</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th scope="col">Status</th><th scope="col">Meaning</th><th scope="col">What to do</th></tr>
          </thead>
          <tbody>
            <tr><td><b>Booked</b></td><td>The shipment has been created and is waiting to be picked up or handed over.</td><td>Nothing yet. It moves to "Picked up" once the courier collects it.</td></tr>
            <tr><td><b>Picked up</b></td><td>The courier has collected the parcel from the sender.</td><td>Nothing; the next scan is usually at a hub.</td></tr>
            <tr><td><b>In transit</b></td><td>The parcel is moving between the courier's hubs and branches toward the destination city.</td><td>Normal. Scans appear only when it is handled at a hub, so gaps of several hours are common.</td></tr>
            <tr><td><b>Out for delivery</b></td><td>The parcel is with the delivery person and should arrive that day.</td><td>Keep your phone reachable; the delivery person may call.</td></tr>
            <tr><td><b>Delivered</b></td><td>The parcel has been handed over at the delivery address.</td><td>If you didn't receive it, contact the courier straight away with the tracking number.</td></tr>
            <tr><td><b>Delayed / Exception</b></td><td>Something stopped normal movement: an incomplete address, the receiver not available, a failed delivery attempt, weather or a vehicle problem.</td><td>Read the latest scan's message. Contact the courier if it needs your action.</td></tr>
            <tr><td><b>Returning to origin (RTO)</b></td><td>Delivery could not be completed and the parcel is being sent back to the sender.</td><td>Contact the sender or seller; they arrange a re-send or refund.</td></tr>
          </tbody>
        </table>
      </div>

      <AdSlot />

      <h2 id="no-information">Why does my tracking number show no information?</h2>
      <p className="answer">Usually because the parcel was booked only recently, the wrong courier was chosen, or the number was typed incorrectly.</p>
      <ol>
        <li><b>Just booked:</b> the first scan can take a few hours, sometimes until the next working day. Try again later.</li>
        <li><b>Wrong courier:</b> make sure the courier selected matches the one on your receipt or shipping message.</li>
        <li><b>Typing mistakes:</b> check for mix-ups such as the letter O and zero, or a missing digit. Enter the number without spaces.</li>
        <li><b>Still nothing after a day:</b> ask the sender or seller to confirm the number and courier, or check on the courier's own website.</li>
      </ol>

      <h2 id="not-updating">Why is my tracking status not updating?</h2>
      <p className="answer">
        Couriers record a scan only when the parcel is processed at a branch or hub, so there are no updates while it is on
        a vehicle between hubs.
      </p>
      <p>
        A long road journey can show no update for a day or more. If there is no update for more than 48 hours, contact the
        courier or the sender with your tracking number — they can check the parcel directly.
      </p>

      <h2 id="delayed">What should I do if my parcel is delayed or a delivery attempt failed?</h2>
      <p className="answer">Check the latest scan message first; then contact the courier with your tracking number if the parcel needs action or hasn't moved for 48 hours.</p>
      <ol>
        <li><b>Read the latest scan.</b> Messages such as "address incomplete", "consignee not available" or "door locked" mean a delivery attempt failed and the courier needs information or a new attempt.</li>
        <li><b>Contact the courier</b> with the tracking number to confirm your address and phone number or arrange redelivery. Couriers usually make a limited number of attempts before returning the parcel to the sender (RTO).</li>
        <li><b>Contact the seller or sender</b> if you bought the item online — they booked the shipment and can raise it with the courier, or arrange a replacement or refund if it is returned.</li>
      </ol>
      {official.length > 0 && (
        <p>
          Official courier websites:{' '}
          {official.map((c, i) => (
            <span key={c.slug}>{i > 0 && ', '}<a href={c.officialUrl} target="_blank" rel="noopener noreferrer">{c.name.replace(/ \(.*\)/, '')} ({host(c.officialUrl)})</a></span>
          ))}.
        </p>
      )}

      <h2 id="more-help">More help</h2>
      <ul>
        {POSTS.map((p) => <li key={p.slug}><a href={postPath(p)}>{p.h1}</a></li>)}
      </ul>

      <h2 id="track">Track your parcel</h2>
      <p>
        Use the <a href="/">Track My Ship tracker</a>, or go to your courier's page:
      </p>
      <ul className="courier-links">
        {SEO.couriers.map((c) => (
          <li key={c.slug}><a href={c.path}>{c.name} tracking</a></li>
        ))}
      </ul>
    </>
  );
}
