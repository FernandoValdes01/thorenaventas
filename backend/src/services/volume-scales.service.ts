import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { volumeScales } from '../db/schema';

type ScalePayload = {
  label?: string;
  minQuantity?: number;
  maxQuantity?: number;
  discountRate?: number;
  objective?: string;
  comment?: string;
};

function toScale(row: typeof volumeScales.$inferSelect) {
  return {
    id: row.id,
    label: row.label,
    minQuantity: row.minQuantity,
    maxQuantity: row.maxQuantity,
    discountRate: Number(row.discountRate) || 0,
    objective: row.objective,
    comment: row.comment,
  };
}

export const volumeScalesService = {
  async list() {
    const rows = await db.select().from(volumeScales).orderBy(asc(volumeScales.minQuantity));
    return rows.map(toScale);
  },

  async create(payload: ScalePayload) {
    const minQuantity = Math.max(1, Math.round(Number(payload.minQuantity) || 1));
    const maxQuantity = Math.max(minQuantity, Math.round(Number(payload.maxQuantity) || minQuantity));
    const row = await db
      .insert(volumeScales)
      .values({
        label: String(payload.label || '').trim(),
        minQuantity,
        maxQuantity,
        discountRate: String(Math.min(0.95, Math.max(0, Number(payload.discountRate) || 0))),
        objective: payload.objective || '',
        comment: payload.comment || '',
      })
      .returning();
    return toScale(row[0]);
  },

  async update(id: string, payload: ScalePayload) {
    const values: Partial<typeof volumeScales.$inferInsert> = { updatedAt: sql`now()` as unknown as Date };
    if (payload.label !== undefined) values.label = payload.label;
    if (payload.minQuantity !== undefined) values.minQuantity = Math.max(1, Math.round(Number(payload.minQuantity) || 1));
    if (payload.maxQuantity !== undefined) values.maxQuantity = Math.max(1, Math.round(Number(payload.maxQuantity) || 1));
    if (payload.discountRate !== undefined) values.discountRate = String(Math.min(0.95, Math.max(0, Number(payload.discountRate) || 0)));
    if (payload.objective !== undefined) values.objective = payload.objective;
    if (payload.comment !== undefined) values.comment = payload.comment;
    const row = await db.update(volumeScales).set(values).where(eq(volumeScales.id, id)).returning();
    return row[0] ? toScale(row[0]) : null;
  },

  async remove(id: string) {
    await db.delete(volumeScales).where(eq(volumeScales.id, id));
    return { deleted: true, id };
  },
};
