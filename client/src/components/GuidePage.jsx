import SEO from '../seo-pages.json';

const PAGE = SEO.pages.find((p) => p.path === '/parcel-tracking-guide');
const fmt = (d) => new Date(`${d}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

// Plain-language explainer: tracking number types and status meanings.
// Statuses match the labels shown in the tracker (StatusBadge / progress steps).
export default function GuidePage() {
  return (
    <>
      <p className="muted">
        By Track My Ship · Published {fmt(PAGE.published)} · Last updated {fmt(PAGE.updated)}
      </p>

      <p className="answer">
        <b>In short:</b> every parcel gets a unique tracking number when it is booked. Couriers call it an AWB,
        consignment, waybill or docket number; road-transport bookings use an LR (lorry receipt) number. Enter that
        number on the <a href="/">tracker</a> to see where the parcel is. An order ID comes from the shop you bought from,
        not the courier.
      </p>

      <h2 id="tracking-numbers">Types of tracking numbers</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th scope="col">Name</th><th scope="col">What it is</th><th scope="col">Who gives it</th></tr>
          </thead>
          <tbody>
            <tr><td><b>AWB number</b></td><td>"Air waybill" number. Most express couriers use the term for every shipment, not only air.</td><td>The courier, at booking</td></tr>
            <tr><td><b>Consignment / docket number</b></td><td>The courier's reference for your shipment, printed on the booking receipt.</td><td>The courier, at booking</td></tr>
            <tr><td><b>Waybill number</b></td><td>Another name for the shipment's tracking number, used by couriers such as Delhivery.</td><td>The courier, at booking</td></tr>
            <tr><td><b>LR number</b></td><td>"Lorry receipt" number for goods sent by road transport (trucks). It works as the tracking number.</td><td>The transporter, at booking</td></tr>
            <tr><td><b>Speed Post article number</b></td><td>13 characters: 2 letters, 9 digits, 2 letters ending in IN (for example EE123456789IN).</td><td>India Post, at booking</td></tr>
            <tr><td><b>Order ID</b></td><td>The shop's or seller's number for your purchase. It is not a courier tracking number, though some sellers let you track with it.</td><td>The seller</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="find-number">Where to find your tracking number</h2>
      <ul>
        <li><b>You sent the parcel:</b> it is printed on the booking receipt the courier gave you.</li>
        <li><b>You bought something online:</b> it is in the shipping confirmation email or SMS, or in the order details on the seller's website or app, usually with the courier's name.</li>
        <li><b>Goods sent by truck:</b> the LR number is on the lorry receipt; ask the sender for a copy.</li>
      </ul>
      <p>
        On Track My Ship you can also search parcels booked with us by the mobile number or email used at booking.
      </p>

      <h2 id="statuses">What tracking statuses mean</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th scope="col">Status</th><th scope="col">Meaning</th><th scope="col">What to do</th></tr>
          </thead>
          <tbody>
            <tr><td><b>Booked</b></td><td>The shipment has been created and is waiting to be picked up or handed over.</td><td>Nothing yet. It moves to "Picked up" once the courier collects it.</td></tr>
            <tr><td><b>Picked up</b></td><td>The courier has collected the parcel from the sender.</td><td>Nothing; the next scan is usually at a hub.</td></tr>
            <tr><td><b>In transit</b></td><td>The parcel is moving between the courier's hubs and branches toward your city.</td><td>Normal. Scans appear only when it is handled at a hub, so gaps of several hours are common.</td></tr>
            <tr><td><b>Out for delivery</b></td><td>The parcel is with the delivery person and should arrive that day.</td><td>Keep your phone reachable; the delivery person may call.</td></tr>
            <tr><td><b>Delivered</b></td><td>The parcel has been handed over at the delivery address.</td><td>If you didn't receive it, contact the courier straight away with the tracking number.</td></tr>
            <tr><td><b>Delayed / Exception</b></td><td>Something stopped normal movement: a wrong or incomplete address, the receiver not available, weather, or a vehicle problem.</td><td>Check the latest scan's message. Contact the courier if it needs your action (for example, an address correction).</td></tr>
            <tr><td><b>Returning to origin (RTO)</b></td><td>Delivery could not be completed and the parcel is being sent back to the sender.</td><td>Contact the sender or seller; they arrange a re-send or refund.</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="not-updating">Why tracking stops updating</h2>
      <p>
        Couriers record a scan when the parcel is processed at a branch or hub. While it is on a vehicle between hubs,
        nothing new appears, so a long-distance road journey can show no update for a day or more. Newly booked parcels
        can also take a few hours to show their first scan.
      </p>
      <p>
        If there is no update for more than 48 hours, or the status is "Delayed", contact the courier or the sender with
        your tracking number — they can check the parcel directly. Track My Ship shows the information the courier
        publishes and cannot change a delivery.
      </p>

      <h2 id="track">Track your parcel</h2>
      <p>
        Use the <a href="/">Track My Ship tracker</a> with any of the numbers above, or go to your courier's page:
      </p>
      <ul className="courier-links">
        {SEO.couriers.map((c) => (
          <li key={c.slug}><a href={c.path}>{c.name} tracking</a></li>
        ))}
      </ul>
    </>
  );
}
