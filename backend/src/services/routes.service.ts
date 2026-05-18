import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { routes } from '../db/schema';

type RoutePayload = {
  date?: string;
  zone?: string;
  sector?: string;
  seller?: string;
  visitedClients?: number;
  clientsWithOrder?: number;
  sales?: number;
  kmRoute?: number;
  fuel?: number;
  observation?: string;
};

const numberValue = (value: unknown) => Number(value) || 0;
const dateInput = (value: Date | string | null | undefined) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

function toRoute(row: typeof routes.$inferSelect) {
  return {
    id: row.id,
    date: dateInput(row.date),
    zone: row.zone,
    sector: row.sector,
    seller: row.seller,
    visitedClients: row.visitedClients,
    clientsWithOrder: row.clientsWithOrder,
    sales: numberValue(row.sales),
    effectivenessPct: numberValue(row.effectivenessPct),
    kmRoute: row.kmRoute,
    fuel: numberValue(row.fuel),
    observation: row.observation,
  };
}

function routeValues(payload: RoutePayload) {
  const visitedClients = Math.max(0, Math.round(Number(payload.visitedClients) || 0));
  const clientsWithOrder = Math.max(0, Math.round(Number(payload.clientsWithOrder) || 0));
  return {
    date: payload.date ? new Date(payload.date) : new Date(),
    zone: String(payload.zone || '').trim(),
    sector: String(payload.sector || '').trim(),
    seller: payload.seller || '',
    visitedClients,
    clientsWithOrder,
    sales: String(Math.max(0, Number(payload.sales) || 0)),
    effectivenessPct: String(visitedClients > 0 ? Math.min(1, clientsWithOrder / visitedClients) : 0),
    kmRoute: Math.max(0, Math.round(Number(payload.kmRoute) || 0)),
    fuel: String(Math.max(0, Number(payload.fuel) || 0)),
    observation: payload.observation || '',
  };
}

export const routesService = {
  async list() {
    const rows = await db.select().from(routes).orderBy(desc(routes.date));
    return rows.map(toRoute);
  },

  async create(payload: RoutePayload) {
    const row = await db.insert(routes).values(routeValues(payload)).returning();
    return toRoute(row[0]);
  },

  async update(id: string, payload: RoutePayload) {
    const current = await db.select().from(routes).where(eq(routes.id, id)).limit(1);
    const base = current[0];
    if (!base) return null;
    const visitedClients = payload.visitedClients !== undefined ? Math.max(0, Math.round(Number(payload.visitedClients) || 0)) : base.visitedClients;
    const clientsWithOrder = payload.clientsWithOrder !== undefined ? Math.max(0, Math.round(Number(payload.clientsWithOrder) || 0)) : base.clientsWithOrder;
    const values: Partial<typeof routes.$inferInsert> = { updatedAt: sql`now()` as unknown as Date };
    if (payload.date !== undefined) values.date = new Date(payload.date);
    if (payload.zone !== undefined) values.zone = payload.zone;
    if (payload.sector !== undefined) values.sector = payload.sector;
    if (payload.seller !== undefined) values.seller = payload.seller;
    if (payload.visitedClients !== undefined) values.visitedClients = visitedClients;
    if (payload.clientsWithOrder !== undefined) values.clientsWithOrder = clientsWithOrder;
    if (payload.visitedClients !== undefined || payload.clientsWithOrder !== undefined) values.effectivenessPct = String(visitedClients > 0 ? Math.min(1, clientsWithOrder / visitedClients) : 0);
    if (payload.sales !== undefined) values.sales = String(Math.max(0, Number(payload.sales) || 0));
    if (payload.kmRoute !== undefined) values.kmRoute = Math.max(0, Math.round(Number(payload.kmRoute) || 0));
    if (payload.fuel !== undefined) values.fuel = String(Math.max(0, Number(payload.fuel) || 0));
    if (payload.observation !== undefined) values.observation = payload.observation;
    const row = await db.update(routes).set(values).where(eq(routes.id, id)).returning();
    return row[0] ? toRoute(row[0]) : null;
  },
};
