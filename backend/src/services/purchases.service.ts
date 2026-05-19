import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { products, purchases, suppliers } from '../db/schema';
import { normalizeText, normalizeTextKey } from '../lib/normalization';

type PurchasePayload = {
  supplierId?: string;
  supplierName?: string;
  date?: string;
  purchaseOrder?: string;
  reception?: 'Recibido' | 'Pendiente' | 'Con observacion';
  doc?: string;
  observation?: string;
  items: Array<{
    productSku: string;
    quantity: number;
    unitCost: number;
    transportUnit?: number;
  }>;
};

type UpdatePurchasePayload = {
  supplierId?: string;
  date?: string;
  purchaseOrder?: string;
  quantity?: number;
  unitCost?: number;
  transportUnit?: number;
  reception?: 'Recibido' | 'Pendiente' | 'Con observacion';
  doc?: string;
  observation?: string;
};

const numberValue = (value: unknown) => Number(value) || 0;
const dateInput = (value: Date | string | null | undefined) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

function toPurchase(row: {
  id: string;
  supplierId: string | null;
  supplier: string | null;
  productId: string | null;
  productSku: string | null;
  product: string | null;
  date: Date;
  purchaseOrder: string;
  quantity: number;
  unitCost: string;
  transportUnit: string;
  totalCost: string;
  reception: string;
  doc: string;
  observation: string;
}) {
  const unitCost = numberValue(row.unitCost);
  const transportUnit = numberValue(row.transportUnit);
  return {
    id: row.id,
    supplierId: row.supplierId || '',
    supplier: row.supplier || '',
    productId: row.productId || '',
    productSku: row.productSku || '',
    sku: row.productSku || '',
    product: row.product || '[Producto Eliminado]',
    date: dateInput(row.date),
    purchaseOrder: row.purchaseOrder,
    quantity: row.quantity,
    unitCost,
    transportUnit,
    totalCost: numberValue(row.totalCost) || row.quantity * (unitCost + transportUnit),
    reception: row.reception,
    doc: row.doc,
    observation: row.observation,
  };
}

export const purchasesService = {
  list: async () => {
    const rows = await db
      .select({
        id: purchases.id,
        supplierId: purchases.supplierId,
        supplier: suppliers.name,
        productId: purchases.productId,
        productSku: products.sku,
        product: products.name,
        date: purchases.date,
        purchaseOrder: purchases.purchaseOrder,
        quantity: purchases.quantity,
        unitCost: purchases.unitCost,
        transportUnit: purchases.transportUnit,
        totalCost: purchases.totalCost,
        reception: purchases.reception,
        doc: purchases.doc,
        observation: purchases.observation,
      })
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .leftJoin(products, eq(purchases.productId, products.id))
      .orderBy(desc(purchases.date));
    return rows.map(toPurchase);
  },

  getById: async (id: string) => {
    const rows = await db
      .select({
        id: purchases.id,
        supplierId: purchases.supplierId,
        supplier: suppliers.name,
        productId: purchases.productId,
        productSku: products.sku,
        product: products.name,
        date: purchases.date,
        purchaseOrder: purchases.purchaseOrder,
        quantity: purchases.quantity,
        unitCost: purchases.unitCost,
        transportUnit: purchases.transportUnit,
        totalCost: purchases.totalCost,
        reception: purchases.reception,
        doc: purchases.doc,
        observation: purchases.observation,
      })
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .leftJoin(products, eq(purchases.productId, products.id))
      .where(eq(purchases.id, id))
      .limit(1);
    return rows[0] ? toPurchase(rows[0]) : null;
  },

  create: async (payload: PurchasePayload) => {
    return db.transaction(async (tx) => {
      let supplierId = payload.supplierId || '';

      if (!supplierId) {
        const supplierName = String(payload.supplierName || '').trim();
        const normalizedName = normalizeText(supplierName);
        const supplierRows = await tx.select({ id: suppliers.id, name: suppliers.name }).from(suppliers);
        const existingSupplier = supplierRows.find((row) => normalizeTextKey(row.name) === normalizeTextKey(normalizedName));

        if (existingSupplier?.id) {
          supplierId = existingSupplier.id;
        } else {
          const inserted = await tx
            .insert(suppliers)
            .values({ name: normalizedName, status: 'Activo' })
            .returning({ id: suppliers.id });
          supplierId = inserted[0].id;
        }
      }

      const createdRows = [];

      for (const item of payload.items) {
        const sku = String(item.productSku || '').trim();
        const productRow = await tx
          .select({ id: products.id, stock: products.stock, supplierId: products.supplierId })
          .from(products)
          .where(eq(products.sku, sku))
          .limit(1);

        const product = productRow[0];
        if (!product) throw new Error(`Producto no existe en Neon para SKU ${sku}`);
        if (product.supplierId && product.supplierId !== supplierId) {
          throw new Error(`El producto ${sku} no pertenece al proveedor seleccionado`);
        }

        const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));
        const unitCost = Math.max(0, Number(item.unitCost) || 0);
        const transportUnit = Math.max(0, Number(item.transportUnit) || 0);

        const insertedPurchase = await tx
          .insert(purchases)
          .values({
            supplierId,
            productId: product.id,
            date: payload.date ? new Date(payload.date) : new Date(),
            purchaseOrder: normalizeText(payload.purchaseOrder || ''),
            quantity,
            unitCost: String(unitCost),
            transportUnit: String(transportUnit),
            totalCost: String(quantity * (unitCost + transportUnit)),
            reception: payload.reception || 'Recibido',
            doc: normalizeText(payload.doc || ''),
            observation: normalizeText(payload.observation || ''),
          })
          .returning({ id: purchases.id, productId: purchases.productId, quantity: purchases.quantity });

        await tx
          .update(products)
          .set({ stock: Math.max(0, Number(product.stock) || 0) + quantity, supplierId })
          .where(eq(products.id, product.id));

        createdRows.push(insertedPurchase[0]);
      }

      return { supplierId, created: createdRows.length, items: createdRows };
    });
  },

  update: async (id: string, payload: UpdatePurchasePayload) => {
    return db.transaction(async (tx) => {
      const currentRow = await tx.select().from(purchases).where(eq(purchases.id, id)).limit(1);
      const current = currentRow[0];
      if (!current) return null;

      const quantity = payload.quantity !== undefined ? Math.max(1, Math.round(Number(payload.quantity) || 1)) : current.quantity;
      const unitCost = payload.unitCost !== undefined ? Math.max(0, Number(payload.unitCost) || 0) : numberValue(current.unitCost);
      const transportUnit = payload.transportUnit !== undefined ? Math.max(0, Number(payload.transportUnit) || 0) : numberValue(current.transportUnit);
      const values: Partial<typeof purchases.$inferInsert> = { updatedAt: sql`now()` as unknown as Date };
      if (payload.supplierId !== undefined) values.supplierId = payload.supplierId;
      if (payload.date !== undefined) values.date = new Date(payload.date);
      if (payload.purchaseOrder !== undefined) values.purchaseOrder = normalizeText(payload.purchaseOrder);
      if (payload.quantity !== undefined) values.quantity = quantity;
      if (payload.unitCost !== undefined) values.unitCost = String(unitCost);
      if (payload.transportUnit !== undefined) values.transportUnit = String(transportUnit);
      if (payload.quantity !== undefined || payload.unitCost !== undefined || payload.transportUnit !== undefined) {
        values.totalCost = String(quantity * (unitCost + transportUnit));
      }
      if (payload.reception !== undefined) values.reception = payload.reception;
      if (payload.doc !== undefined) values.doc = normalizeText(payload.doc);
      if (payload.observation !== undefined) values.observation = normalizeText(payload.observation);

      const updated = await tx.update(purchases).set(values).where(eq(purchases.id, id)).returning();

      if (payload.quantity !== undefined && current.productId) {
        const productRow = await tx.select({ stock: products.stock }).from(products).where(eq(products.id, current.productId)).limit(1);
        const product = productRow[0];
        if (product) {
          const delta = quantity - current.quantity;
          await tx
            .update(products)
            .set({ stock: Math.max(0, (Number(product.stock) || 0) + delta), updatedAt: sql`now()` })
            .where(eq(products.id, current.productId));
        }
      }

      return updated[0] ? { updated: true, id } : null;
    });
  },
};
