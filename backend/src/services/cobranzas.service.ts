import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { cobranzas } from '../db/schema';

type CobranzaPayload = {
  clientId?: string;
  clientName?: string;
  document?: string;
  issueDate?: string;
  dueDate?: string;
  amount?: number;
  paidAmount?: number;
  balance?: number;
  status?: 'Pendiente' | 'Vencido' | 'Pagada';
  notes?: string;
};

const numberValue = (value: unknown) => Number(value) || 0;
const dateInput = (value: Date | string | null | undefined) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

function toCobranza(row: typeof cobranzas.$inferSelect) {
  return {
    id: row.id,
    clientId: row.clientId || '',
    clientName: row.clientName,
    document: row.document,
    issueDate: dateInput(row.issueDate),
    dueDate: dateInput(row.dueDate),
    amount: numberValue(row.amount),
    paidAmount: numberValue(row.paidAmount),
    balance: numberValue(row.balance),
    status: row.status,
    notes: row.notes,
  };
}

function cobranzaValues(payload: CobranzaPayload) {
  const amount = Math.max(0, Number(payload.amount) || 0);
  const paidAmount = Math.max(0, Number(payload.paidAmount) || 0);
  const balance = payload.balance !== undefined ? Math.max(0, Number(payload.balance) || 0) : Math.max(0, amount - paidAmount);
  return {
    clientId: payload.clientId || null,
    clientName: payload.clientName || '',
    document: payload.document || '',
    issueDate: payload.issueDate ? new Date(payload.issueDate) : null,
    dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
    amount: String(amount),
    paidAmount: String(paidAmount),
    balance: String(balance),
    status: payload.status || (balance > 0 ? 'Pendiente' : 'Pagada'),
    notes: payload.notes || '',
  };
}

export const cobranzasService = {
  async list() {
    const rows = await db.select().from(cobranzas).orderBy(desc(cobranzas.createdAt));
    return rows.map(toCobranza);
  },

  async create(payload: CobranzaPayload) {
    const row = await db.insert(cobranzas).values(cobranzaValues(payload)).returning();
    return toCobranza(row[0]);
  },

  async update(id: string, payload: CobranzaPayload) {
    const values: Partial<typeof cobranzas.$inferInsert> = { updatedAt: sql`now()` as unknown as Date };
    if (payload.clientId !== undefined) values.clientId = payload.clientId || null;
    if (payload.clientName !== undefined) values.clientName = payload.clientName;
    if (payload.document !== undefined) values.document = payload.document;
    if (payload.issueDate !== undefined) values.issueDate = payload.issueDate ? new Date(payload.issueDate) : null;
    if (payload.dueDate !== undefined) values.dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
    if (payload.amount !== undefined) values.amount = String(Math.max(0, Number(payload.amount) || 0));
    if (payload.paidAmount !== undefined) values.paidAmount = String(Math.max(0, Number(payload.paidAmount) || 0));
    if (payload.balance !== undefined) values.balance = String(Math.max(0, Number(payload.balance) || 0));
    if (payload.status !== undefined) values.status = payload.status;
    if (payload.notes !== undefined) values.notes = payload.notes;
    const row = await db.update(cobranzas).set(values).where(eq(cobranzas.id, id)).returning();
    return row[0] ? toCobranza(row[0]) : null;
  },

  async remove(id: string) {
    await db.delete(cobranzas).where(eq(cobranzas.id, id));
    return { deleted: true, id };
  },
};
