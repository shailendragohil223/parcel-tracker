const BASE = import.meta.env.VITE_API_URL || '';

export async function fetchCouriers() {
  const res = await fetch(`${BASE}/api/couriers`);
  if (!res.ok) return [];
  return (await res.json()).couriers || [];
}

export async function trackParcel(q, type = 'auto', courier = '') {
  const params = new URLSearchParams({ q, type });
  if (courier) params.set('courier', courier);
  const res = await fetch(`${BASE}/api/track?${params}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

// Scan times are shown in Indian time (IST) for every visitor, matching courier websites.
const TZ = 'Asia/Kolkata';

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }) : '—';

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ }) : '';
