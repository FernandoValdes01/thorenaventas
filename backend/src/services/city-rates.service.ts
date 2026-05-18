import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { cityRates } from '../db/schema';

type CityRatePayload = { city?: string; rate?: number };

const toCityRate = (row: typeof cityRates.$inferSelect) => ({
  id: row.id,
  city: row.city,
  rate: Number(row.rate) || 0,
});

export const cityRatesService = {
  async list() {
    const rows = await db.select().from(cityRates).orderBy(asc(cityRates.city));
    return rows.map(toCityRate);
  },

  async create(payload: CityRatePayload) {
    const city = String(payload.city || '').trim();
    const rate = String(Math.min(0.95, Math.max(0, Number(payload.rate) || 0)));
    const row = await db
      .insert(cityRates)
      .values({ city, rate })
      .onConflictDoUpdate({ target: cityRates.city, set: { rate, updatedAt: sql`now()` } })
      .returning();
    return toCityRate(row[0]);
  },

  async update(id: string, payload: CityRatePayload) {
    const values: Partial<typeof cityRates.$inferInsert> = { updatedAt: sql`now()` as unknown as Date };
    if (payload.city !== undefined) values.city = payload.city;
    if (payload.rate !== undefined) values.rate = String(Math.min(0.95, Math.max(0, Number(payload.rate) || 0)));
    const row = await db.update(cityRates).set(values).where(eq(cityRates.id, id)).returning();
    return row[0] ? toCityRate(row[0]) : null;
  },

  async remove(id: string) {
    await db.delete(cityRates).where(eq(cityRates.id, id));
    return { deleted: true, id };
  },
};
