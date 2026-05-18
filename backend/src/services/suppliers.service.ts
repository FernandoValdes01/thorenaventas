import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { suppliers } from '../db/schema';

type SupplierPayload = {
  name?: string;
  contact?: string;
  phone?: string;
  email?: string;
  status?: 'Activo' | 'Inactivo';
  notes?: string;
};

function toSupplier(row: typeof suppliers.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    phone: row.phone,
    email: row.email,
    status: row.status,
    notes: row.notes,
  };
}

export const suppliersService = {
  async list() {
    const rows = await db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
    return rows.map(toSupplier);
  },

  async getById(id: string) {
    const row = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
    return row[0] ? toSupplier(row[0]) : null;
  },

  async create(payload: SupplierPayload) {
    const row = await db
      .insert(suppliers)
      .values({
        name: String(payload.name || '').trim(),
        contact: payload.contact || '',
        phone: payload.phone || '',
        email: payload.email || '',
        status: payload.status || 'Activo',
        notes: payload.notes || '',
      })
      .returning();
    return toSupplier(row[0]);
  },

  async update(id: string, payload: SupplierPayload) {
    const values: Partial<typeof suppliers.$inferInsert> = { updatedAt: sql`now()` as unknown as Date };
    if (payload.name !== undefined) values.name = payload.name;
    if (payload.contact !== undefined) values.contact = payload.contact;
    if (payload.phone !== undefined) values.phone = payload.phone;
    if (payload.email !== undefined) values.email = payload.email;
    if (payload.status !== undefined) values.status = payload.status;
    if (payload.notes !== undefined) values.notes = payload.notes;

    const row = await db.update(suppliers).set(values).where(eq(suppliers.id, id)).returning();
    return row[0] ? toSupplier(row[0]) : null;
  },
};
