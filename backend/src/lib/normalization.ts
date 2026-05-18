const SPACE_REGEX = /\s+/g;

export function normalizeText(value: unknown) {
  return String(value || '').replace(SPACE_REGEX, ' ').trim();
}

export function normalizeTextKey(value: unknown) {
  return normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export function validateEmail(value: unknown) {
  const email = normalizeEmail(value);
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizePhone(value: unknown) {
  const cleaned = String(value || '').replace(/[^\d+]/g, '');
  if (!cleaned) return '';

  let digits = cleaned;
  if (digits.startsWith('+')) digits = digits.slice(1);

  if (digits.startsWith('56')) {
    const local = digits.slice(2);
    return local ? `+56${local}` : '';
  }

  if (digits.startsWith('0')) {
    const local = digits.slice(1);
    return local ? `+56${local}` : '';
  }

  if (digits.length === 9) return `+56${digits}`;
  return cleaned.startsWith('+') ? `+${digits}` : digits;
}

export function validatePhone(value: unknown) {
  const phone = normalizePhone(value);
  if (!phone) return true;
  return /^\+56(?:9\d{8}|[2-7]\d{7})$/.test(phone);
}

export function normalizeRut(value: unknown) {
  const cleaned = String(value || '')
    .replace(/[.\-\s]/g, '')
    .toUpperCase();
  if (!cleaned) return '';
  if (cleaned.length < 2) return cleaned;
  const body = cleaned.slice(0, -1).replace(/\D/g, '');
  const dv = cleaned.slice(-1);
  if (!body || !/[0-9K]/.test(dv)) return cleaned;
  return `${body}-${dv}`;
}

function computeRutDv(body: string) {
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const rest = 11 - (sum % 11);
  if (rest === 11) return '0';
  if (rest === 10) return 'K';
  return String(rest);
}

export function validateRut(value: unknown) {
  return validateRutDetailed(value).valid;
}

export function validateRutDetailed(value: unknown) {
  const normalized = normalizeRut(value);
  if (!normalized) return { valid: true, reason: 'empty' as const, normalized };
  const [body, dv] = normalized.split('-');
  if (!body || !dv || body.length < 7 || body.length > 9) return { valid: false, reason: 'format' as const, normalized };
  if (!/^\d+$/.test(body) || !/^[0-9K]$/.test(dv)) return { valid: false, reason: 'format' as const, normalized };
  const valid = computeRutDv(body) === dv;
  return { valid, reason: valid ? ('ok' as const) : ('dv' as const), normalized };
}
