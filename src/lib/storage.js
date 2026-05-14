const hasWindow = typeof window !== 'undefined';

export function readString(storage, key, fallback) {
  if (!hasWindow || !storage) return fallback;

  try {
    const value = storage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

export function writeString(storage, key, value) {
  if (!hasWindow || !storage) return false;

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeItem(storage, key) {
  if (!hasWindow || !storage) return false;

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function readJSON(storage, key, fallback) {
  const raw = readString(storage, key, null);
  if (raw === null) return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJSON(storage, key, value) {
  return writeString(storage, key, JSON.stringify(value));
}
