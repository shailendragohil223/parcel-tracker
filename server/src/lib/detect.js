// Works out what kind of identifier the customer typed.
// Types: phone | email | lr | order | awb (consignment / AWB / tracking number)

export function normalize(raw = '') {
  return String(raw).trim();
}

export function normalizePhone(raw) {
  let digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2); // +91
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export function detectType(raw, hint) {
  const q = normalize(raw);
  if (hint && hint !== 'auto') return hint;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q)) return 'email';
  if (/^(\+?91[\s-]?)?0?[6-9]\d{9}$/.test(q.replace(/[\s-]/g, ''))) return 'phone';
  if (/^LR[\s-]?\w+$/i.test(q)) return 'lr';
  if (/^(ORD|ORDER|SO)[\s-]?\w+$/i.test(q)) return 'order';
  return 'awb';
}

export function validate(raw, type) {
  const q = normalize(raw);
  if (!q) return 'Please enter a tracking number, phone, email or LR number.';
  if (q.length > 80) return 'Input is too long.';
  if (type === 'phone' && normalizePhone(q).length !== 10) return 'Enter a valid 10-digit mobile number.';
  if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q)) return 'Enter a valid email address.';
  if (!/^[\w@.+\-\s]+$/.test(q)) return 'Input contains invalid characters.';
  return null;
}

// Hide personal details in public responses.
export function maskPhone(p = '') {
  const d = normalizePhone(p);
  return d.length === 10 ? `${d.slice(0, 2)}******${d.slice(-2)}` : '';
}
export function maskEmail(e = '') {
  const [u, dom] = String(e).split('@');
  if (!dom) return '';
  return `${u.slice(0, 2)}${'*'.repeat(Math.max(1, u.length - 2))}@${dom}`;
}
