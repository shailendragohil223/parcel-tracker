import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Free OpenStreetMap tiles by default. To use another provider (Mapbox, MapTiler,
// Google via a plugin), set VITE_MAP_TILE_URL in client/.env.
const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = import.meta.env.VITE_MAP_TILE_ATTR || '&copy; OpenStreetMap contributors';

const pin = (cls, label) =>
  L.divIcon({ className: '', html: `<div class="pin ${cls}"><span>${label}</span></div>`, iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] });

const ICONS = {
  origin: pin('pin--origin', 'A'),
  dest: pin('pin--dest', 'B'),
  truck: L.divIcon({ className: '', html: '<div class="truck">🚚</div>', iconSize: [36, 36], iconAnchor: [18, 18] }),
};

const hasXY = (p) => p && typeof p.lat === 'number' && typeof p.lng === 'number';

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [40, 40] });
    else if (points.length === 1) map.setView(points[0], 10);
  }, [map, JSON.stringify(points)]);
  return null;
}

export default function TrackingMap({ shipment: s }) {
  const scans = s.events.filter(hasXY);
  const travelled = scans.map((e) => [e.lat, e.lng]);
  const current = s.currentLocation && hasXY(s.currentLocation) ? [s.currentLocation.lat, s.currentLocation.lng] : travelled.at(-1);
  const origin = hasXY(s.origin) ? [s.origin.lat, s.origin.lng] : travelled[0];
  const dest = hasXY(s.destination) ? [s.destination.lat, s.destination.lng] : null;
  const delivered = s.status === 'DELIVERED';

  const all = [origin, dest, ...travelled].filter(Boolean);
  if (!all.length) return <div className="map-empty">Map not available for this shipment yet.</div>;

  return (
    <MapContainer center={all[0]} zoom={5} scrollWheelZoom={false} className="map">
      <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
      <FitBounds points={all} />

      {travelled.length > 1 && <Polyline positions={travelled} pathOptions={{ color: '#1d4ed8', weight: 4 }} />}
      {!delivered && current && dest && (
        <Polyline positions={[current, dest]} pathOptions={{ color: '#64748b', weight: 3, dashArray: '6 8' }} />
      )}

      {scans.slice(1, -1).map((e, i) => (
        <CircleMarker key={i} center={[e.lat, e.lng]} radius={5} pathOptions={{ color: '#1d4ed8', fillColor: '#fff', fillOpacity: 1, weight: 2 }}>
          <Popup><b>{e.location}</b><br />{e.description}</Popup>
        </CircleMarker>
      ))}

      {origin && <Marker position={origin} icon={ICONS.origin}><Popup>Origin: {s.origin?.city}</Popup></Marker>}
      {dest && <Marker position={dest} icon={ICONS.dest}><Popup>Destination: {s.destination?.city}</Popup></Marker>}
      {!delivered && current && (
        <Marker position={current} icon={ICONS.truck} zIndexOffset={1000}>
          <Popup><b>Current location</b><br />{s.currentLocation?.location}</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
