import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { clients } from '../db/schema';
import { AppError } from '../lib/errors';
import {
  normalizeEmail,
  normalizePhone,
  normalizeRut,
  normalizeText,
  normalizeTextKey,
  validateEmail,
  validatePhone,
  validateRutDetailed,
} from '../lib/normalization';

type ClientPayload = {
  code?: string;
  name?: string;
  businessName?: string;
  nickname?: string;
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
    name: row.nickname || row.name,
    businessName: row.businessName || row.name,
    nickname: row.nickname || row.name,
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
  const rut = normalizeRut(payload.rut || '');
  const phone = normalizePhone(payload.phone || '');
  const whatsapp = normalizePhone(payload.whatsapp || '');
  const email = normalizeEmail(payload.email || '');

  const rutCheck = validateRutDetailed(rut);
  if (!rutCheck.valid) throw new AppError('VALIDATION_ERROR', rutCheck.reason === 'format' ? 'Formato de RUT invalido. Usa 12345678-5.' : 'RUT invalido. Digito verificador incorrecto.', 400);
  if (!validatePhone(phone)) throw new AppError('VALIDATION_ERROR', 'Telefono invalido. Usa formato chileno +56...', 400);
  if (!validatePhone(whatsapp)) throw new AppError('VALIDATION_ERROR', 'WhatsApp invalido. Usa formato chileno +56...', 400);
  if (!validateEmail(email)) throw new AppError('VALIDATION_ERROR', 'Correo invalido.', 400);

  const businessName = normalizeText(payload.businessName || payload.name || '');
  const nickname = normalizeText(payload.nickname || payload.name || payload.businessName || '');

  return {
    code: String(payload.code || `CLI-${Date.now().toString().slice(-6)}`),
    name: nickname,
    businessName,
    nickname,
    type: normalizeText(payload.type || 'Negocio fijo'),
    rut,
    phone,
    whatsapp,
    contact: normalizeText(payload.contact || ''),
    email,
    instagram: normalizeText(payload.instagram || ''),
    address: normalizeText(payload.address || ''),
    zone: normalizeText(payload.zone || ''),
    sector: normalizeText(payload.sector || ''),
    frequency: normalizeText(payload.frequency || 'Semanal'),
    creditEnabled: Boolean(payload.creditEnabled),
    debt: String(Math.max(0, Number(payload.debt) || 0)),
    monthlyTarget: String(Math.max(0, Number(payload.monthlyTarget) || 0)),
    accumulatedSales: String(Math.max(0, Number(payload.accumulatedSales) || 0)),
    goalProgress: String(Math.min(1, Math.max(0, Number(payload.goalProgress) || 0))),
    creditLimit: String(Math.max(0, Number(payload.creditLimit) || 0)),
    status: payload.status || 'Activo',
    notes: normalizeText(payload.notes || ''),
    observations: normalizeText(payload.observations || payload.notes || ''),
    lastPurchase: parseDate(payload.lastPurchase),
  };
}

function updateValues(payload: ClientPayload) {
  const values: Partial<typeof clients.$inferInsert> = { updatedAt: sql`now()` as unknown as Date };
  if (payload.code !== undefined) values.code = normalizeText(payload.code);
  if (payload.name !== undefined) values.name = normalizeText(payload.name);
  if (payload.businessName !== undefined) values.businessName = normalizeText(payload.businessName);
  if (payload.nickname !== undefined) {
    const nickname = normalizeText(payload.nickname);
    values.nickname = nickname;
    values.name = nickname;
  }
  if (payload.type !== undefined) values.type = normalizeText(payload.type);
  if (payload.rut !== undefined) {
    const rut = normalizeRut(payload.rut);
    const rutCheck = validateRutDetailed(rut);
    if (!rutCheck.valid) throw new AppError('VALIDATION_ERROR', rutCheck.reason === 'format' ? 'Formato de RUT invalido. Usa 12345678-5.' : 'RUT invalido. Digito verificador incorrecto.', 400);
    values.rut = rut;
  }
  if (payload.phone !== undefined) {
    const phone = normalizePhone(payload.phone);
    if (!validatePhone(phone)) throw new AppError('VALIDATION_ERROR', 'Telefono invalido. Usa formato chileno +56...', 400);
    values.phone = phone;
  }
  if (payload.whatsapp !== undefined) {
    const whatsapp = normalizePhone(payload.whatsapp);
    if (!validatePhone(whatsapp)) throw new AppError('VALIDATION_ERROR', 'WhatsApp invalido. Usa formato chileno +56...', 400);
    values.whatsapp = whatsapp;
  }
  if (payload.contact !== undefined) values.contact = normalizeText(payload.contact);
  if (payload.email !== undefined) {
    const email = normalizeEmail(payload.email);
    if (!validateEmail(email)) throw new AppError('VALIDATION_ERROR', 'Correo invalido.', 400);
    values.email = email;
  }
  if (payload.instagram !== undefined) values.instagram = normalizeText(payload.instagram);
  if (payload.address !== undefined) values.address = normalizeText(payload.address);
  if (payload.zone !== undefined) values.zone = normalizeText(payload.zone);
  if (payload.sector !== undefined) values.sector = normalizeText(payload.sector);
  if (payload.frequency !== undefined) values.frequency = normalizeText(payload.frequency);
  if (payload.creditEnabled !== undefined) values.creditEnabled = payload.creditEnabled;
  if (payload.debt !== undefined) values.debt = String(Math.max(0, Number(payload.debt) || 0));
  if (payload.monthlyTarget !== undefined) values.monthlyTarget = String(Math.max(0, Number(payload.monthlyTarget) || 0));
  if (payload.accumulatedSales !== undefined) values.accumulatedSales = String(Math.max(0, Number(payload.accumulatedSales) || 0));
  if (payload.goalProgress !== undefined) values.goalProgress = String(Math.min(1, Math.max(0, Number(payload.goalProgress) || 0)));
  if (payload.creditLimit !== undefined) values.creditLimit = String(Math.max(0, Number(payload.creditLimit) || 0));
  if (payload.status !== undefined) values.status = payload.status;
  if (payload.notes !== undefined) values.notes = normalizeText(payload.notes);
  if (payload.observations !== undefined) values.observations = normalizeText(payload.observations);
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
    const rut = normalizeRut(payload.rut || '');
    if (rut) {
      const rows = await db.select({ id: clients.id, rut: clients.rut }).from(clients);
      const duplicated = rows.find((row) => normalizeTextKey(row.rut) === normalizeTextKey(rut));
      if (duplicated) throw new AppError('DUPLICATE_RUT', 'Ya existe un cliente con ese RUT.', 409);
    }
    const row = await db.insert(clients).values(clientValues(payload)).returning();
    return toClient(row[0]);
  },

  async update(id: string, payload: ClientPayload) {
    if (payload.rut !== undefined) {
      const nextRut = normalizeRut(payload.rut || '');
      if (nextRut) {
        const rows = await db.select({ id: clients.id, rut: clients.rut }).from(clients);
        const duplicated = rows.find((row) => row.id !== id && normalizeTextKey(row.rut) === normalizeTextKey(nextRut));
        if (duplicated) throw new AppError('DUPLICATE_RUT', 'Ya existe un cliente con ese RUT.', 409);
      }
    }
    const row = await db.update(clients).set(updateValues(payload)).where(eq(clients.id, id)).returning();
    return row[0] ? toClient(row[0]) : null;
  },

  async remove(id: string) {
    await db.delete(clients).where(eq(clients.id, id));
    return { deleted: true, id };
  },
};
