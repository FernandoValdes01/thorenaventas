import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { sales } from '../db/schema';

type SalePayload = {
  date?: string;
  client?: string;
  zone?: string;
  sector?: string;
  seller?: string;
  orderCode?: string;
  product?: string;
  sale?: number;
  cost?: number;
  paymentMethod?: string;
  dispatchStatus?: string;
};

const numberValue = (value: unknown) => Number(value) || 0;
const dateInput = (value: Date | string | null | undefined) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

function toSale(row: typeof sales.$inferSelect) {
  const saleValue = numberValue(row.sale) || numberValue(row.total);
  const costValue = numberValue(row.cost);
  const profit = numberValue(row.profit) || Math.max(0, saleValue - costValue);
  return {
    id: row.id,
    date: dateInput(row.date),
    client: row.client,
    zone: row.zone,
    sector: row.sector,
    seller: row.seller,
    orderCode: row.orderCode,
    product: row.product,
    sale: saleValue,
    cost: costValue,
    profit,
    marginPct: numberValue(row.marginPct) || (saleValue > 0 ? profit / saleValue : 0),
    paymentMethod: row.paymentMethod,
    dispatchStatus: row.dispatchStatus,
  };
}

function saleValues(payload: SalePayload) {
  const saleValue = Math.max(0, Number(payload.sale) || 0);
  const costValue = Math.max(0, Number(payload.cost) || 0);
  const profit = Math.max(0, saleValue - costValue);
  return {
    date: payload.date ? new Date(payload.date) : new Date(),
    client: payload.client || '',
    zone: payload.zone || 'Sin zona',
    sector: payload.sector || 'Sin sector',
    seller: payload.seller || '',
    orderCode: payload.orderCode || '',
    product: payload.product || '',
    sale: String(saleValue),
    cost: String(costValue),
    profit: String(profit),
    marginPct: String(saleValue > 0 ? profit / saleValue : 0),
    paymentMethod: payload.paymentMethod || '',
    dispatchStatus: payload.dispatchStatus || 'Pendiente',
    total: String(saleValue),
  };
}

export const salesService = {
  async list() {
    const rows = await db.select().from(sales).orderBy(desc(sales.date));
    return rows.map(toSale);
  },

  async create(payload: SalePayload) {
    const row = await db.insert(sales).values(saleValues(payload)).returning();
    return toSale(row[0]);
  },

  async update(id: string, payload: SalePayload) {
    const values: Partial<typeof sales.$inferInsert> = { updatedAt: sql`now()` as unknown as Date };
    if (payload.date !== undefined) values.date = new Date(payload.date);
    if (payload.client !== undefined) values.client = payload.client;
    if (payload.zone !== undefined) values.zone = payload.zone;
    if (payload.sector !== undefined) values.sector = payload.sector;
    if (payload.seller !== undefined) values.seller = payload.seller;
    if (payload.orderCode !== undefined) values.orderCode = payload.orderCode;
    if (payload.product !== undefined) values.product = payload.product;
    const saleValue = payload.sale !== undefined ? Math.max(0, Number(payload.sale) || 0) : undefined;
    const costValue = payload.cost !== undefined ? Math.max(0, Number(payload.cost) || 0) : undefined;
    if (saleValue !== undefined) {
      values.sale = String(saleValue);
      values.total = String(saleValue);
    }
    if (costValue !== undefined) values.cost = String(costValue);
    if (saleValue !== undefined || costValue !== undefined) {
      const current = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
      const baseSale = saleValue ?? numberValue(current[0]?.sale);
      const baseCost = costValue ?? numberValue(current[0]?.cost);
      const profit = Math.max(0, baseSale - baseCost);
      values.profit = String(profit);
      values.marginPct = String(baseSale > 0 ? profit / baseSale : 0);
    }
    if (payload.paymentMethod !== undefined) values.paymentMethod = payload.paymentMethod;
    if (payload.dispatchStatus !== undefined) values.dispatchStatus = payload.dispatchStatus;

    const row = await db.update(sales).set(values).where(eq(sales.id, id)).returning();
    return row[0] ? toSale(row[0]) : null;
  },
};
