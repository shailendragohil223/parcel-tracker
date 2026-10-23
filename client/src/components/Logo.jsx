// Track My Ship logo: a route with three stops (booked → in transit → delivered),
// the last one highlighted. Same artwork as public/logo-mark.svg.
export default function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="tms-logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0f1f4b" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#tms-logo-bg)" />
      <path d="M14 48 H26 Q32 48 32 42 V28 Q32 22 38 22 H44" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="14" cy="48" r="4.5" fill="#fff" />
      <circle cx="32" cy="35" r="4" fill="#1a3a9e" stroke="#fff" strokeWidth="3" />
      <circle cx="47" cy="22" r="8" fill="#f59e0b" />
      <circle cx="47" cy="22" r="3" fill="#0f1f4b" />
    </svg>
  );
}
