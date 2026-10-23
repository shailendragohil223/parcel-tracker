// Turns a scan location ("Bhiwandi Hub, Maharashtra") into lat/lng for the map.
// Results are cached in memory so each place is only looked up once.
const cache = new Map();
let lastNominatimCall = 0;

export async function geocode(place) {
  if (!place) return null;
  const key = place.toLowerCase().trim();
  if (cache.has(key)) return cache.get(key);

  let result = null;
  try {
    if (process.env.GEOCODER === 'google' && process.env.GOOGLE_MAPS_API_KEY) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(place)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      const r = await fetch(url);
      const j = await r.json();
      const loc = j.results?.[0]?.geometry?.location;
      if (loc) result = { lat: loc.lat, lng: loc.lng };
    } else {
      // Nominatim usage policy: max 1 request per second, identify your app.
      const wait = 1100 - (Date.now() - lastNominatimCall);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastNominatimCall = Date.now();
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`;
      const r = await fetch(url, { headers: { 'User-Agent': process.env.GEOCODER_USER_AGENT || 'parcel-tracker/1.0' } });
      const j = await r.json();
      if (j[0]) result = { lat: +j[0].lat, lng: +j[0].lon };
    }
  } catch (e) {
    console.warn('Geocode failed for', place, e.message);
  }
  cache.set(key, result);
  return result;
}

// Fill in coordinates for any event that lacks them.
export async function enrichWithCoords(shipment) {
  for (const ev of shipment.events) {
    if (ev.lat == null && (ev.geoQuery || ev.location)) {
      const c = await geocode(ev.geoQuery || ev.location);
      if (c) Object.assign(ev, c);
    }
    delete ev.geoQuery;
  }
  for (const k of ['origin', 'destination']) {
    const p = shipment[k];
    if (p && p.lat == null && p.city) {
      const c = await geocode(`${p.city}, ${p.state || ''} India`);
      if (c) Object.assign(p, c);
    }
  }
  return shipment;
}
