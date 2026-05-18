import { env } from './env';

function normalizeOrigin(value: string) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return url.origin;
  } catch {
    return '';
  }
}

function hostToHttpsOrigin(value: string) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return normalizeOrigin(raw);
  return normalizeOrigin(`https://${raw}`);
}

function splitCsv(value: string) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const vercelOrigins = [
  hostToHttpsOrigin(process.env.VERCEL_URL || ''),
  hostToHttpsOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL || ''),
].filter(Boolean);

const extraOrigins = splitCsv(process.env.ALLOWED_ORIGINS || '').map((item) => normalizeOrigin(item)).filter(Boolean);

const originSet = new Set<string>([
  normalizeOrigin(env.FRONTEND_URL),
  normalizeOrigin('http://localhost:5173'),
  ...vercelOrigins,
  ...extraOrigins,
].filter(Boolean));

export const trustedOrigins = [...originSet];
