import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { suppliers } from '../db/schema';
import { AppError } from '../lib/errors';
import { normalizeEmail, normalizePhone, normalizeText, normalizeTextKey, validateEmail, validatePhone } from '../lib/normalization';

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
    const name = normalizeText(payload.name || '');
    const phone = normalizePhone(payload.phone || '');
    const email = normalizeEmail(payload.email || '');
    if (!validatePhone(phone)) throw new AppError('VALIDATION_ERROR', 'Telefono invalido. Usa formato chileno +56...', 400);
    if (!validateEmail(email)) throw new AppError('VALIDATION_ERROR', 'Correo invalido.', 400);

    const rows = await db.select({ id: suppliers.id, name: suppliers.name }).from(suppliers);
    const byName = rows.find((row) => normalizeTextKey(row.name) === normalizeTextKey(name));
    if (byName) {
      const existing = await db.select().from(suppliers).where(eq(suppliers.id, byName.id)).limit(1);
      return toSupplier(existing[0]);
    }

    const row = await db
      .insert(suppliers)
      .values({
        name,
        contact: normalizeText(payload.contact || ''),
        phone,
        email,
        status: payload.status || 'Activo',
        notes: normalizeText(payload.notes || ''),
      })
      .returning();
    return toSupplier(row[0]);
  },

  async update(id: string, payload: SupplierPayload) {
    const values: Partial<typeof suppliers.$inferInsert> = { updatedAt: sql`now()` as unknown as Date };
    if (payload.name !== undefined) values.name = normalizeText(payload.name);
    if (payload.contact !== undefined) values.contact = normalizeText(payload.contact);
    if (payload.phone !== undefined) {
      const phone = normalizePhone(payload.phone);
      if (!validatePhone(phone)) throw new AppError('VALIDATION_ERROR', 'Telefono invalido. Usa formato chileno +56...', 400);
      values.phone = phone;
    }
    if (payload.email !== undefined) {
      const email = normalizeEmail(payload.email);
      if (!validateEmail(email)) throw new AppError('VALIDATION_ERROR', 'Correo invalido.', 400);
      values.email = email;
    }
    if (payload.status !== undefined) values.status = payload.status;
    if (payload.notes !== undefined) values.notes = normalizeText(payload.notes);

    const row = await db.update(suppliers).set(values).where(eq(suppliers.id, id)).returning();
    return row[0] ? toSupplier(row[0]) : null;
  },
};
