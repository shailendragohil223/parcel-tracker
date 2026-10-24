import SEO from '../seo-pages.json';
import GuidePage from './GuidePage.jsx';

// About & Contact, Privacy Policy and Terms of Use.
// Google Ads (and Google Analytics' terms) require a privacy policy and real
// contact details on the site. Business details come from seo-pages.json → "business".
const B = SEO.business;
const fmtDay = (d) => new Date(`${d}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
const updatedOn = (path) => fmtDay(SEO.pages.find((p) => p.path === path).updated);

function ContactDetails() {
  const wa = (B.whatsapp || '').replace(/\D/g, '');
  const items = [
    B.email && <li key="e"><b>Email:</b> <a href={`mailto:${B.email}`}>{B.email}</a></li>,
    B.phone && <li key="p"><b>Phone:</b> <a href={`tel:${B.phone.replace(/\s/g, '')}`}>{B.phone}</a></li>,
    wa && <li key="w"><b>WhatsApp:</b> <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">{B.whatsapp}</a></li>,
    B.address && <li key="a"><b>Address:</b> {B.address}</li>,
  ].filter(Boolean);
  if (!items.length) return <p className="muted">Contact details will be published here shortly.</p>;
  return <ul className="contact-list">{items}</ul>;
}

function Contact() {
  return (
    <>
      <h2>About Track My Ship</h2>
      <p>
        Track My Ship is a free website for tracking parcels sent with courier companies in India. Enter the courier's
        tracking (AWB / consignment) number to see the latest status, the full scan history and the parcel's route on a
        map — for DTDC, Blue Dart, Delhivery, Speed Post (India Post), Trackon and other couriers in one place.
      </p>
      <h2>What Track My Ship is — and isn't</h2>
      <ul>
        <li><b>It is</b> an independent tracking website, run from Vadodara, Gujarat. It is free and needs no account.</li>
        <li><b>It is not</b> a courier company. We do not book, carry or deliver parcels, and we are not affiliated with or endorsed by the couriers listed.</li>
        <li><b>Where the information comes from:</b> the scans each courier publishes, fetched through a tracking data provider (TrackCourier.io). We show them as they are and cannot change a delivery.</li>
        <li><b>Who it's for:</b> anyone in India waiting for a parcel or checking one they sent, especially when several couriers are involved.</li>
      </ul>
      <p>
        New to tracking numbers? Read our <a href="/parcel-tracking-guide">parcel tracking guide</a> for what AWB,
        consignment and LR numbers are and what each tracking status means.
      </p>
      <h2>Contact us</h2>
      <p>For questions about this website, corrections or business enquiries:</p>
      <ContactDetails />
      <p className="muted">
        For delivery problems (delay, damage, address change, failed delivery), please contact the courier or the sender
        directly — they hold your parcel and can act on it. The <a href="/parcel-tracking-guide#delayed">tracking guide</a> explains
        what to do.
      </p>
    </>
  );
}

function Privacy() {
  return (
    <>
      <p className="muted">Last updated: {updatedOn('/privacy-policy')}</p>
      <p>
        This policy explains what information {B.name} ("we") handles when you use trackmyship.co, and why. We follow the
        Digital Personal Data Protection Act, 2023 and other applicable Indian law.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><b>What you search for:</b> the tracking number you enter, and the courier you choose. We use it only to look up that shipment. We don't ask for your name, phone number, email or address.</li>
        <li><b>Tracking results:</b> the status and scans published by the courier for that number, shown to you and not stored in a database.</li>
        <li><b>Technical data:</b> IP address, browser type and pages visited, recorded in server logs and by Google Analytics.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To find and show the status of your shipment.</li>
        <li>To keep the service secure, for example limiting the number of searches to prevent misuse.</li>
        <li>To understand how the site is used and improve it (Google Analytics).</li>
      </ul>
      <p>
        Tracking links you share (for example trackmyship.co/?q=NUMBER) contain only the tracking number. These result
        pages are marked so search engines don't index them.
      </p>

      <h2>Who we share it with</h2>
      <ul>
        <li><b>Tracking data provider:</b> the tracking number and courier are sent to our tracking data provider (TrackCourier.io), which fetches the status from the courier. Results are kept in temporary memory for up to 30 minutes so repeat searches are faster.</li>
        <li><b>Google Analytics:</b> collects usage statistics with cookies. Tracking numbers are removed from page addresses before they are sent. See <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">how Google uses data from sites that use its services</a>; you can opt out with the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics opt-out add-on</a>.</li>
        <li><b>Map and font services:</b> map images are loaded from OpenStreetMap and fonts from Google Fonts, which receive your IP address when your browser requests them.</li>
        <li><b>Advertising:</b> we may use Google Ads to advertise our service and measure how ads perform, and Google AdSense to show ads on this site (see below).</li>
        <li>Authorities, when required by law.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>Advertising and cookies</h2>
      <p>
        The site itself does not need cookies to work. Google Analytics and Google Ads set cookies to measure visits and ad
        performance.
      </p>
      <p>
        We may show ads from Google AdSense. Third-party vendors, including Google, use cookies to serve ads based on your
        previous visits to this and other websites. Google's use of advertising cookies enables it and its partners to serve
        ads based on your visits to this site and/or other sites on the internet. You can opt out of personalised advertising
        in <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>, or opt
        out of some third-party vendors' cookies at <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">aboutads.info</a>.
        Learn more about <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">how Google uses cookies in advertising</a>.
      </p>
      <p>You can block or delete cookies in your browser settings at any time.</p>

      <h2>How long we keep it</h2>
      <p>
        Searches are not stored in a database; cached results are deleted after 30 minutes. Server logs, which can include
        IP addresses, are kept for a limited period for security.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to access, correct or delete personal information we hold about you, or raise a complaint, by contacting
        us using the details below{B.grievanceOfficer ? ` (Grievance Officer: ${B.grievanceOfficer})` : ''}. We will respond
        within the time required by law.
      </p>
      <ContactDetails />

      <h2>Changes</h2>
      <p>We may update this policy. The date at the top shows when it last changed.</p>
    </>
  );
}

function Terms() {
  return (
    <>
      <p className="muted">Last updated: {updatedOn('/terms')}</p>
      <p>By using trackmyship.co you agree to these terms.</p>

      <h2>The service</h2>
      <p>
        Track My Ship is a free website that shows tracking information for courier shipments. It is not a courier: we do
        not book, carry or deliver parcels. Tracking information comes from the couriers through a tracking data provider;
        we do not control it and cannot guarantee it is complete, accurate or up to date. Delivery dates are estimates. For
        decisions that matter, confirm with the courier.
      </p>

      <h2>Not affiliated with couriers</h2>
      <p>
        Courier names such as DTDC, Blue Dart, Delhivery and India Post are trademarks of their owners and are used only to
        identify the shipments you can track. Track My Ship is not affiliated with or endorsed by them.
      </p>

      <h2>Fair use</h2>
      <ul>
        <li>Only track shipments you are the sender or receiver of, or are authorised to track.</li>
        <li>Do not use automated tools to search in bulk, scrape the site or try to guess other people's numbers. Searches are rate-limited.</li>
        <li>Do not interfere with the site's security or operation.</li>
      </ul>

      <h2>Liability</h2>
      <p>
        The service is provided free and "as is". To the extent permitted by law, we are not liable for losses arising from
        delays, missing or incorrect tracking information, or the actions of couriers. Claims about a shipment (loss, damage,
        delay) must be made with the courier that carried it.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India.</p>

      <h2>Contact</h2>
      <ContactDetails />
    </>
  );
}

const BODIES = { '/parcel-tracking-guide': GuidePage, '/contact': Contact, '/privacy-policy': Privacy, '/terms': Terms };

export const infoPageFor = (path) => SEO.pages.find((p) => p.path === path.replace(/\/$/, '')) || null;

export default function InfoPage({ page }) {
  const Body = BODIES[page.path];
  return (
    <article className={`panel info-page ${page.type === 'article' ? 'info-page--article' : ''}`}>
      <Body />
    </article>
  );
}
