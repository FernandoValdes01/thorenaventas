import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { clients } from '../db/schema';

type ClientPayload = {
  code?: string;
  name?: string;
  type?: string;
  rut?: string;
  phone?: string;
  whatsapp?: string;
  contact?: string;
  email?: string;
  instagram?: string;
  address?: string;
  zone?: string;
  sector?: string;
  frequency?: string;
  creditEnabled?: boolean;
  debt?: number;
  monthlyTarget?: number;
  accumulatedSales?: number;
  goalProgress?: number;
  creditLimit?: number;
  status?: string;
  notes?: string;
  observations?: string;
  lastPurchase?: string;
};

const numberValue = (value: unknown) => Number(value) || 0;
const dateInput = (value: Date | string | null | undefined) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toClient(row: typeof clients.$inferSelect) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    rut: row.rut,
    phone: row.phone,
    whatsapp: row.whatsapp,
    contact: row.contact,
    email: row.email,
    instagram: row.instagram,
    address: row.address,
    zone: row.zone,
    sector: row.sector,
    frequency: row.frequency,
    creditEnabled: row.creditEnabled,
    debt: numberValue(row.debt),
    monthlyTarget: numberValue(row.monthlyTarget),
    accumulatedSales: numberValue(row.accumulatedSales),
    goalProgress: numberValue(row.goalProgress),
    creditLimit: numberValue(row.creditLimit),
    status: row.status,
    notes: row.notes,
    observations: row.observations,
    lastPurchase: dateInput(row.lastPurchase),
  };
}

function clientValues(payload: ClientPayload) {
  return {
    code: String(payload.code || `CLI-${Date.now().toString().slice(-6)}`),
    name: String(payload.name || '').trim(),
    type: String(payload.type || 'Negocio fijo'),
    rut: payload.rut || '',
    phone: payload.phone || '',
    whatsapp: payload.whatsapp || '',
    contact: payload.contact || '',
    email: payload.email || '',
    instagram: payload.instagram || '',
    address: payload.address || '',
    zone: payload.zone || '',
    sector: payload.sector || '',
    frequency: payload.frequency || 'Semanal',
    creditEnabled: Boolean(payload.creditEnabled),
    debt: String(Math.max(0, Number(payload.debt) || 0)),
    monthlyTarget: String(Math.max(0, Number(payload.monthlyTarget) || 0)),
    accumulatedSales: String(Math.max(0, Number(payload.accumulatedSales) || 0)),
    goalProgress: String(Math.min(1, Math.max(0, Number(payload.goalProgress) || 0))),
    creditLimit: String(Math.max(0, Number(payload.creditLimit) || 0)),
    status: payload.status || 'Activo',
    notes: payload.notes || '',
    observations: payload.observations || payload.notes || '',
    lastPurchase: parseDate(payload.lastPurchase),
  };
}

function updateValues(payload: ClientPayload) {
  const values: Partial<typeof clients.$inferInsert> = { updatedAt: sql`now()` as unknown as Date };
  if (payload.code !== undefined) values.code = payload.code;
  if (payload.name !== undefined) values.name = payload.name;
  if (payload.type !== undefined) values.type = payload.type;
  if (payload.rut !== undefined) values.rut = payload.rut;
  if (payload.phone !== undefined) values.phone = payload.phone;
  if (payload.whatsapp !== undefined) values.whatsapp = payload.whatsapp;
  if (payload.contact !== undefined) values.contact = payload.contact;
  if (payload.email !== undefined) values.email = payload.email;
  if (payload.instagram !== undefined) values.instagram = payload.instagram;
  if (payload.address !== undefined) values.address = payload.address;
  if (payload.zone !== undefined) values.zone = payload.zone;
  if (payload.sector !== undefined) values.sector = payload.sector;
  if (payload.frequency !== undefined) values.frequency = payload.frequency;
  if (payload.creditEnabled !== undefined) values.creditEnabled = payload.creditEnabled;
  if (payload.debt !== undefined) values.debt = String(Math.max(0, Number(payload.debt) || 0));
  if (payload.monthlyTarget !== undefined) values.monthlyTarget = String(Math.max(0, Number(payload.monthlyTarget) || 0));
  if (payload.accumulatedSales !== undefined) values.accumulatedSales = String(Math.max(0, Number(payload.accumulatedSales) || 0));
  if (payload.goalProgress !== undefined) values.goalProgress = String(Math.min(1, Math.max(0, Number(payload.goalProgress) || 0)));
  if (payload.creditLimit !== undefined) values.creditLimit = String(Math.max(0, Number(payload.creditLimit) || 0));
  if (payload.status !== undefined) values.status = payload.status;
  if (payload.notes !== undefined) values.notes = payload.notes;
  if (payload.observations !== undefined) values.observations = payload.observations;
  if (payload.lastPurchase !== undefined) values.lastPurchase = parseDate(payload.lastPurchase);
  return values;
}

export const clientsService = {
  async list() {
    const rows = await db.select().from(clients).orderBy(desc(clients.createdAt));
    return rows.map(toClient);
  },

  async getById(id: string) {
    const row = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return row[0] ? toClient(row[0]) : null;
  },

  async create(payload: ClientPayload) {
    const row = await db.insert(clients).values(clientValues(payload)).returning();
    return toClient(row[0]);
  },

  async update(id: string, payload: ClientPayload) {
    const row = await db.update(clients).set(updateValues(payload)).where(eq(clients.id, id)).returning();
    return row[0] ? toClient(row[0]) : null;
  },

  async remove(id: string) {
    await db.delete(clients).where(eq(clients.id, id));
    return { deleted: true, id };
  },
};
