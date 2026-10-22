const TONE = {
  DELIVERED: 'ok',
  OUT_FOR_DELIVERY: 'info',
  IN_TRANSIT: 'info',
  PICKED_UP: 'info',
  BOOKED: 'neutral',
  EXCEPTION: 'warn',
  RTO: 'bad',
};

export default function StatusBadge({ status, text }) {
  return <span className={`badge badge--${TONE[status] || 'neutral'}`}>{text || status}</span>;
}
