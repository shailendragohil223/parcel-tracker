import { useEffect, useRef } from 'react';

// Google AdSense display ad unit ("Track My Ship", slot 2045498736).
// The AdSense library itself is loaded once in index.html <head>. This renders the <ins>
// placeholder and asks AdSense to fill it after the page has loaded in the browser.
// Ads are only requested on the live domain, so local copies and automated tests don't
// generate ad requests. Keep ads away from the search box (AdSense policy on accidental clicks).
const CLIENT = 'ca-pub-8533675750419666';
const isLiveSite = () => typeof window !== 'undefined' && /(^|\.)trackmyship\.co$/.test(window.location.hostname);

export default function AdSlot({ slot = '2045498736' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !isLiveSite() || el.getAttribute('data-adsbygoogle-status')) return; // already filled
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // Ad blockers or no fill: the page works the same without the ad.
    }
  }, []);

  return (
    <div className="ad-slot" aria-label="Advertisement">
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
