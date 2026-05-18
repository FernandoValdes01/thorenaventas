import { desc, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { clients, cobranzas, orderItems, orders, products, sales } from '../db/schema';

type OrderItemPayload = {
  productId: string;
  productName: string;
  quantity: number;
  basePrice?: number;
  offerDiscountPercent?: number;
  unitPriceBeforeScale?: number;
  unitPrice: number;
  volumeScaleId?: string;
  volumeScaleLabel?: string;
  volumeDiscountRate?: number;
  volumeDiscountPercent?: number;
  subtotalBeforeScale?: number;
  discountAmount?: number;
  subtotal: number;
};

type OrderPayload = {
  code?: string;
  createdAt?: string;
  clientId?: string;
  customerName?: string;
  customerRut?: string;
  customerNumber?: string;
  contactPhone?: string;
  deliveryAddress?: string;
  saleChannel: 'terreno' | 'online' | 'oficina';
  paymentMethod: string;
  status?: string;
  subtotalBeforeDiscount?: number;
  totalDiscountAmount?: number;
  itemsTotal?: number;
  dispatchCity?: string;
  dispatchRate?: number;
  dispatchSurcharge?: number;
  total?: number;
  observations?: string;
  sellerName?: string;
  sellerRut?: string;
  showReceipt?: boolean;
  clientSnapshot?: {
    id?: string;
    name?: string;
    type?: string;
    zone?: string;
    sector?: string;
    debt?: number;
  } | null;
  items: OrderItemPayload[];
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const numberValue = (value: unknown) => Number(value) || 0;
const isUuid = (value: string) => uuidRegex.test(String(value || ''));
const isCreditPayment = (paymentMethod: string) => ['credito 7 dias', 'credito 15 dias'].includes(String(paymentMethod || '').trim().toLowerCase());
const creditDaysByMethod = (paymentMethod: string) =>
  String(paymentMethod || '').trim().toLowerCase() === 'credito 15 dias' ? 15 : 7;

function iso(value: Date | string | null | undefined) {
  if (!value) return new Date().toISOString();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function toOrder(row: typeof orders.$inferSelect, items: Array<typeof orderItems.$inferSelect>) {
  return {
    id: row.id,
    code: row.code,
    createdAt: iso(row.createdAt),
    saleChannel: row.saleChannel,
    customerName: row.customerName,
    customerRut: row.customerRut,
    customerNumber: row.customerNumber,
    contactPhone: row.contactPhone,
    deliveryAddress: row.deliveryAddress,
    observations: row.observations,
    clientId: row.clientId || '',
    paymentMethod: row.paymentMethod,
    sellerName: row.sellerName,
    sellerRut: row.sellerRut,
    status: row.status,
    subtotalBeforeDiscount: numberValue(row.subtotalBeforeDiscount),
    totalDiscountAmount: numberValue(row.totalDiscountAmount),
    itemsTotal: numberValue(row.itemsTotal),
    dispatchCity: row.dispatchCity,
    dispatchRate: numberValue(row.dispatchRate),
    dispatchSurcharge: numberValue(row.dispatchSurcharge),
    total: numberValue(row.total),
    clientSnapshot: {
      id: row.clientId || '',
      name: row.customerName,
      type: row.clientTypeSnapshot,
      zone: row.zoneSnapshot,
      sector: row.sectorSnapshot,
      creditEnabled: false,
      debt: numberValue(row.debtSnapshot),
    },
    checklist: {},
    showReceipt: row.showReceipt,
    items: items.map((item) => ({
      productId: item.productId || item.productNameSnapshot,
      productName: item.productNameSnapshot,
      quantity: item.quantity,
      basePrice: numberValue(item.basePrice),
      offerDiscountPercent: numberValue(item.offerDiscountPercent),
      unitPriceBeforeScale: numberValue(item.unitPriceBeforeScale) || numberValue(item.unitPrice),
      unitPrice: numberValue(item.unitPrice),
      volumeScaleId: item.volumeScaleId,
      volumeScaleLabel: item.volumeScaleLabel || 'Sin escala',
      volumeDiscountRate: numberValue(item.volumeDiscountRate),
      volumeDiscountPercent: numberValue(item.volumeDiscountPercent),
      subtotalBeforeScale: numberValue(item.subtotalBeforeScale) || numberValue(item.subtotal),
      discountAmount: numberValue(item.discountAmount),
      subtotal: numberValue(item.subtotal),
    })),
  };
}

async function nextOrderCode(tx: any) {
  const rows: Array<{ code: string }> = await tx.select({ code: orders.code }).from(orders);
  const highest = rows.reduce((max: number, row: { code: string }) => {
    const match = /^PED-(\d{4})$/.exec(row.code);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0);
  return `PED-${String(highest + 1).padStart(4, '0')}`;
}

async function createSalesForOrder(tx: any, order: typeof orders.$inferSelect, items: Array<typeof orderItems.$inferSelect>) {
  const existing = await tx.select({ id: sales.id }).from(sales).where(eq(sales.orderCode, order.code)).limit(1);
  if (existing[0]) return;

  const productIds = items.map((item) => item.productId).filter((id): id is string => Boolean(id));
  const productRows: Array<typeof products.$inferSelect> = productIds.length
    ? await tx.select().from(products).where(inArray(products.id, productIds))
    : [];
  const productCostById = new Map<string, number>(productRows.map((product: typeof products.$inferSelect) => [product.id, numberValue(product.finalCost)]));

  for (const item of items) {
    const saleValue = numberValue(item.subtotal);
    const costValue = Math.max(0, productCostById.get(item.productId || '') ?? 0) * item.quantity;
    const profit = Math.max(0, saleValue - costValue);
    await tx.insert(sales).values({
      orderId: order.id,
      date: new Date(),
      client: order.customerName,
      zone: order.zoneSnapshot || order.dispatchCity,
      sector: order.sectorSnapshot,
      seller: order.sellerName,
      orderCode: order.code,
      product: item.productNameSnapshot,
      sale: String(saleValue),
      cost: String(costValue),
      profit: String(profit),
      marginPct: String(saleValue > 0 ? profit / saleValue : 0),
      paymentMethod: order.paymentMethod,
      dispatchStatus: order.status,
      total: String(saleValue),
    });
  }
}

export const ordersService = {
  async list() {
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, ids));
    const byOrder = new Map<string, Array<typeof orderItems.$inferSelect>>();
    items.forEach((item) => {
      if (!byOrder.has(item.orderId)) byOrder.set(item.orderId, []);
      byOrder.get(item.orderId)?.push(item);
    });
    return rows.map((row) => toOrder(row, byOrder.get(row.id) || []));
  },

  async getById(id: string) {
    const row = await db
      .select()
      .from(orders)
      .where(isUuid(id) ? or(eq(orders.id, id), eq(orders.code, id)) : eq(orders.code, id))
      .limit(1);
    if (!row[0]) return null;
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, row[0].id));
    return toOrder(row[0], items);
  },

  async create(payload: OrderPayload) {
    return db.transaction(async (tx) => {
      const code = payload.code || (await nextOrderCode(tx));
      const clientId = payload.clientId && uuidRegex.test(payload.clientId) ? payload.clientId : null;
      let clientSnapshot = payload.clientSnapshot || null;

      if (clientId && !clientSnapshot) {
        const clientRow = await tx.select().from(clients).where(eq(clients.id, clientId)).limit(1);
        const client = clientRow[0];
        if (client) {
          clientSnapshot = {
            id: client.id,
            name: client.name,
            type: client.type,
            zone: client.zone,
            sector: client.sector,
            debt: numberValue(client.debt),
          };
        }
      }

      const insertedOrder = await tx
        .insert(orders)
        .values({
          code,
          clientId,
          customerName: payload.customerName || clientSnapshot?.name || '',
          customerRut: payload.customerRut || '',
          customerNumber: payload.customerNumber || payload.contactPhone || '',
          contactPhone: payload.contactPhone || payload.customerNumber || '',
          deliveryAddress: payload.deliveryAddress || '',
          sellerName: payload.sellerName || '',
          sellerRut: payload.sellerRut || '',
          clientTypeSnapshot: clientSnapshot?.type || '',
          zoneSnapshot: clientSnapshot?.zone || payload.dispatchCity || '',
          sectorSnapshot: clientSnapshot?.sector || '',
          debtSnapshot: String(Math.max(0, Number(clientSnapshot?.debt) || 0)),
          saleChannel: payload.saleChannel,
          status: payload.status || 'Pedido',
          paymentMethod: payload.paymentMethod,
          subtotalBeforeDiscount: String(Math.max(0, Number(payload.subtotalBeforeDiscount) || 0)),
          totalDiscountAmount: String(Math.max(0, Number(payload.totalDiscountAmount) || 0)),
          itemsTotal: String(Math.max(0, Number(payload.itemsTotal) || 0)),
          dispatchCity: payload.dispatchCity || '',
          dispatchRate: String(Math.max(0, Number(payload.dispatchRate) || 0)),
          dispatchSurcharge: String(Math.max(0, Number(payload.dispatchSurcharge) || 0)),
          total: String(Math.max(0, Number(payload.total) || 0)),
          observations: payload.observations || '',
          showReceipt: Boolean(payload.showReceipt),
          createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
          updatedAt: sql`now()`,
        })
        .returning();

      const insertedItems: Array<typeof orderItems.$inferSelect> = [];
      for (const item of payload.items) {
        const productRow = await tx
          .select()
          .from(products)
          .where(isUuid(item.productId) ? or(eq(products.id, item.productId), eq(products.sku, item.productId)) : eq(products.sku, item.productId))
          .limit(1);
        const product = productRow[0];
        if (!product) throw new Error(`Producto no existe para ${item.productName}`);

        const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));
        if ((Number(product.stock) || 0) < quantity) {
          throw new Error(`Stock insuficiente para ${product.name}`);
        }

        await tx
          .update(products)
          .set({ stock: Math.max(0, (Number(product.stock) || 0) - quantity), updatedAt: sql`now()` })
          .where(eq(products.id, product.id));

        const row = await tx
          .insert(orderItems)
          .values({
            orderId: insertedOrder[0].id,
            productId: product.id,
            productNameSnapshot: item.productName,
            quantity,
            basePrice: String(Math.max(0, Number(item.basePrice) || 0)),
            offerDiscountPercent: String(Math.max(0, Number(item.offerDiscountPercent) || 0)),
            unitPriceBeforeScale: String(Math.max(0, Number(item.unitPriceBeforeScale) || Number(item.unitPrice) || 0)),
            unitPrice: String(Math.max(0, Number(item.unitPrice) || 0)),
            volumeScaleId: item.volumeScaleId || '',
            volumeScaleLabel: item.volumeScaleLabel || 'Sin escala',
            volumeDiscountRate: String(Math.max(0, Number(item.volumeDiscountRate) || 0)),
            volumeDiscountPercent: String(Math.max(0, Number(item.volumeDiscountPercent) || 0)),
            subtotalBeforeScale: String(Math.max(0, Number(item.subtotalBeforeScale) || Number(item.subtotal) || 0)),
            discountAmount: String(Math.max(0, Number(item.discountAmount) || 0)),
            subtotal: String(Math.max(0, Number(item.subtotal) || 0)),
          })
          .returning();
        insertedItems.push(row[0]);
      }

      if (insertedOrder[0].status === 'Pagado') {
        await createSalesForOrder(tx, insertedOrder[0], insertedItems);
      }

      return toOrder(insertedOrder[0], insertedItems);
    });
  },

  async updateStatus(id: string, status: string) {
    return db.transaction(async (tx) => {
      const row = await tx
        .select()
        .from(orders)
        .where(isUuid(id) ? or(eq(orders.id, id), eq(orders.code, id)) : eq(orders.code, id))
        .limit(1);
      const current = row[0];
      if (!current) return null;

      if (status === 'Pendiente de pago' && !isCreditPayment(current.paymentMethod)) {
        throw new Error('Pendiente de pago solo aplica para credito 7 o 15 dias.');
      }

      const updated = await tx
        .update(orders)
        .set({ status, updatedAt: sql`now()` })
        .where(eq(orders.id, current.id))
        .returning();
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, current.id));

      if (status === 'Pagado') {
        await createSalesForOrder(tx, updated[0], items);

        if (isCreditPayment(updated[0].paymentMethod)) {
          const pendingCobranza = await tx
            .select()
            .from(cobranzas)
            .where(eq(cobranzas.document, updated[0].code))
            .limit(1);
          const cobranza = pendingCobranza[0];
          if (cobranza) {
            const amount = Math.max(0, numberValue(cobranza.balance));
            await tx
              .update(cobranzas)
              .set({ paidAmount: String(numberValue(cobranza.paidAmount) + amount), balance: '0', status: 'Pagada', updatedAt: sql`now()` })
              .where(eq(cobranzas.id, cobranza.id));

            if (updated[0].clientId) {
              const clientRow = await tx.select().from(clients).where(eq(clients.id, updated[0].clientId)).limit(1);
              const client = clientRow[0];
              if (client) {
                const nextDebt = Math.max(0, numberValue(client.debt) - amount);
                await tx.update(clients).set({ debt: String(nextDebt), updatedAt: sql`now()` }).where(eq(clients.id, updated[0].clientId));
              }
            }
          }
        }
      }

      if (status === 'Pendiente de pago' && isCreditPayment(updated[0].paymentMethod)) {
        const totalAmount = Math.max(0, numberValue(updated[0].total));
        const issueDate = new Date();
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + creditDaysByMethod(updated[0].paymentMethod));

        const cobranzaRows = await tx.select().from(cobranzas).where(eq(cobranzas.document, updated[0].code)).limit(1);
        const cobranza = cobranzaRows[0];

        if (cobranza) {
          const previousBalance = Math.max(0, numberValue(cobranza.balance));
          await tx
            .update(cobranzas)
            .set({
              clientId: updated[0].clientId,
              clientName: updated[0].customerName,
              issueDate,
              dueDate,
              amount: String(totalAmount),
              paidAmount: '0',
              balance: String(totalAmount),
              status: 'Pendiente',
              notes: `Credito generado desde pedido ${updated[0].code}`,
              updatedAt: sql`now()`,
            })
            .where(eq(cobranzas.id, cobranza.id));

          if (updated[0].clientId) {
            const clientRow = await tx.select().from(clients).where(eq(clients.id, updated[0].clientId)).limit(1);
            const client = clientRow[0];
            if (client) {
              const nextDebt = Math.max(0, numberValue(client.debt) - previousBalance + totalAmount);
              await tx.update(clients).set({ debt: String(nextDebt), updatedAt: sql`now()` }).where(eq(clients.id, updated[0].clientId));
            }
          }
        } else {
          await tx.insert(cobranzas).values({
            clientId: updated[0].clientId,
            clientName: updated[0].customerName,
            document: updated[0].code,
            issueDate,
            dueDate,
            amount: String(totalAmount),
            paidAmount: '0',
            balance: String(totalAmount),
            status: 'Pendiente',
            notes: `Credito generado desde pedido ${updated[0].code}`,
          });

          if (updated[0].clientId) {
            const clientRow = await tx.select().from(clients).where(eq(clients.id, updated[0].clientId)).limit(1);
            const client = clientRow[0];
            if (client) {
              const nextDebt = Math.max(0, numberValue(client.debt) + totalAmount);
              await tx.update(clients).set({ debt: String(nextDebt), updatedAt: sql`now()` }).where(eq(clients.id, updated[0].clientId));
            }
          }
        }
      }

      return toOrder(updated[0], items);
    });
  },
};
