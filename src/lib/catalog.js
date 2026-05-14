import { PRODUCTS as DEFAULT_PRODUCTS } from '../data/appData';

const CURRENCY_FORMATTER = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
});

const OFFER_MODES = new Set(['none', 'date', 'stock']);

const normalizeText = (value, fallback = '') => String(value ?? fallback).trim();

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeInt = (value, fallback = 0) => Math.max(0, Math.round(normalizeNumber(value, fallback)));

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const createId = (prefix = 'prod') =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const formatCurrency = (value) => CURRENCY_FORMATTER.format(normalizeInt(value));

export const formatDate = (value) => {
  if (!value) return '';

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return normalizeText(value);
  }

  return DATE_FORMATTER.format(parsed);
};

export function normalizeOffer(offer = {}) {
  const mode = OFFER_MODES.has(offer.mode) ? offer.mode : 'none';
  const discountPercent = clamp(normalizeInt(offer.discountPercent, 0), 0, 100);
  const endDate = mode === 'date' ? normalizeText(offer.endDate) : '';

  return {
    mode,
    discountPercent,
    endDate,
  };
}

export function normalizeProduct(raw = {}, index = 0) {
  const name = normalizeText(raw.name ?? raw.productName ?? raw.nombre);

  if (!name) {
    return null;
  }

  return {
    id: normalizeText(raw.id) || createId(`prod-${index}`),
    name,
    category: normalizeText(raw.category ?? raw.categoria ?? 'General') || 'General',
    stock: normalizeInt(raw.stock ?? raw.quantity ?? raw.cantidad, 0),
    basePrice: Math.max(0, Math.round(normalizeNumber(raw.basePrice ?? raw.price ?? raw.precio, 0))),
    offer: normalizeOffer(raw.offer ?? raw.oferta),
  };
}

export function normalizeProducts(products = DEFAULT_PRODUCTS) {
  return products.map((product, index) => normalizeProduct(product, index)).filter(Boolean);
}

const productKey = (product) => `${normalizeText(product.name).toLowerCase()}::${normalizeText(product.category).toLowerCase()}`;

export function mergeProductList(currentProducts, incomingRaw) {
  const incoming = normalizeProduct(incomingRaw, currentProducts.length);

  if (!incoming) {
    return currentProducts;
  }

  const index = currentProducts.findIndex((product) => productKey(product) === productKey(incoming));

  if (index === -1) {
    return [...currentProducts, incoming];
  }

  const existing = currentProducts[index];
  const hasIncomingOffer = incoming.offer.mode !== 'none' && incoming.offer.discountPercent > 0;

  const next = {
    ...existing,
    name: incoming.name,
    category: incoming.category,
    stock: existing.stock + incoming.stock,
    basePrice: incoming.basePrice > 0 ? incoming.basePrice : existing.basePrice,
    offer: hasIncomingOffer ? incoming.offer : existing.offer,
  };

  const updated = [...currentProducts];
  updated[index] = normalizeProduct(next, index);

  return updated;
}

export function updateProductOffer(currentProducts, productId, rawOffer) {
  return currentProducts.map((product) =>
    product.id === productId
      ? {
          ...product,
          offer: normalizeOffer(rawOffer),
        }
      : product,
  );
}

export function getActiveOffer(product, now = new Date()) {
  if (!product) return null;

  const offer = normalizeOffer(product.offer);

  if (offer.mode === 'none' || offer.discountPercent <= 0) {
    return null;
  }

  if (offer.mode === 'date') {
    if (!offer.endDate) {
      return null;
    }

    const endDate = new Date(`${offer.endDate}T23:59:59`);
    if (Number.isNaN(endDate.getTime()) || now > endDate) {
      return null;
    }
  }

  if (offer.mode === 'stock' && normalizeInt(product.stock, 0) <= 0) {
    return null;
  }

  const label = offer.mode === 'date' ? `Hasta ${formatDate(offer.endDate)}` : 'Hasta agotar stock';

  return {
    ...offer,
    label,
  };
}

export function getCurrentPrice(product, now = new Date()) {
  const basePrice = Math.max(0, Math.round(normalizeNumber(product?.basePrice, 0)));
  const activeOffer = getActiveOffer(product, now);

  if (!activeOffer) {
    return basePrice;
  }

  return Math.max(0, Math.round(basePrice * (1 - activeOffer.discountPercent / 100)));
}

export function buildProductOptionLabel(product, now = new Date()) {
  const activeOffer = getActiveOffer(product, now);
  const currentPrice = getCurrentPrice(product, now);
  const stockLabel = normalizeInt(product.stock, 0) > 0 ? `${normalizeInt(product.stock, 0)} en stock` : 'sin stock';

  if (activeOffer) {
    return `${product.name} · ${formatCurrency(currentPrice)} · ${activeOffer.discountPercent}% desc.`;
  }

  return `${product.name} · ${formatCurrency(currentPrice)} · ${stockLabel}`;
}

export function formatOfferSummary(product, now = new Date()) {
  const activeOffer = getActiveOffer(product, now);

  if (!activeOffer) {
    return 'Sin oferta';
  }

  return `${activeOffer.discountPercent}% descuento · ${activeOffer.label}`;
}

function getCellValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return row[key];
    }
  }

  return '';
}

export async function parseProductsFromExcelFile(file) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return [];
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

  return rows
    .map((row, index) =>
      normalizeProduct(
        {
          name: getCellValue(row, ['nombre', 'name', 'producto', 'Producto']),
          category: getCellValue(row, ['categoria', 'category', 'Categoría', 'Categoria']) || 'General',
          stock: getCellValue(row, ['cantidad', 'quantity', 'stock', 'Stock']),
          basePrice: getCellValue(row, ['precio', 'price', 'Precio', 'Price']),
        },
        index,
      ),
    )
    .filter(Boolean);
}
