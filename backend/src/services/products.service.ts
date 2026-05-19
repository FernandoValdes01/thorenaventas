import { desc, eq, or, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { orderItems, products, purchases, quoteItems, suppliers } from '../db/schema';
import { AppError } from '../lib/errors';
import { normalizeEmail, normalizePhone, normalizeText, normalizeTextKey, validateEmail, validatePhone } from '../lib/normalization';
import { detailStub } from './base.service';

type CreateProductPayload = {
  sku: string;
  name: string;
  category: string;
  unit?: string;
  basePrice?: number;
  supplierId?: string;
  newSupplier?: {
    name: string;
    contact?: string;
    phone?: string;
    email?: string;
  };
  barcode?: string;
  brand?: string;
  stockMin?: number;
  purchaseCost?: number;
  transportUnit?: number;
  location?: string;
  status?: 'Activo' | 'Inactivo';
  initialPurchase: {
    quantity: number;
    unitCost: number;
    transportUnit?: number;
    purchaseOrder?: string;
    doc?: string;
    reception?: 'Recibido' | 'Pendiente' | 'Con observacion';
    observation?: string;
  };
};

type UpdateProductPayload = {
  name?: string;
  category?: string;
  stock?: number;
  stockMin?: number;
  basePrice?: number;
  salePriceBase?: number;
  status?: 'Activo' | 'Inactivo';
  barcode?: string;
  brand?: string;
  unit?: string;
  purchaseCost?: number;
  transportUnit?: number;
  location?: string;
  supplierId?: string | null;
};

const numberValue = (value: unknown) => Number(value) || 0;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value: string) => uuidRegex.test(String(value || ''));

function toProduct(row: typeof products.$inferSelect) {
  const purchaseCost = numberValue(row.purchaseCost);
  const transportUnit = numberValue(row.transportUnit);
  const finalCost = numberValue(row.finalCost);
  const salePriceBase = numberValue(row.basePrice);
  const unitProfit = Math.max(0, salePriceBase - finalCost);
  return {
    id: row.id,
    sku: row.sku,
    supplierId: row.supplierId || '',
    name: row.name,
    product: row.name,
    category: row.category,
    barcode: row.barcode,
    brand: row.brand,
    unit: row.unit,
    stock: Number(row.stock) || 0,
    stockMin: Number(row.stockMin) || 0,
    purchaseCost,
    transportUnit,
    finalCost,
    salePriceBase,
    basePrice: salePriceBase,
    unitProfit,
    marginPct: salePriceBase > 0 ? unitProfit / salePriceBase : 0,
    location: row.location,
    status: row.status,
    offer: { mode: 'none', discountPercent: 0, endDate: '' },
  };
}

export const productsService = {
  list: async () => {
    const rows = await db.select().from(products).orderBy(desc(products.createdAt));
    return rows.map(toProduct);
  },
  getById: async (id: string) => {
    const row = await db
      .select()
      .from(products)
      .where(isUuid(id) ? or(eq(products.id, id), eq(products.sku, id)) : eq(products.sku, id))
      .limit(1);
    if (!row[0]) return detailStub('products', id);
    return toProduct(row[0]);
  },
  getBySku: async (sku: string) => {
    const row = await db.select().from(products).where(eq(products.sku, sku)).limit(1);
    return row[0] ? toProduct(row[0]) : null;
  },
  createWithInitialPurchase: async (payload: CreateProductPayload) => {
    const created = await db.transaction(async (tx) => {
      let supplierId = payload.supplierId || '';
      const normalizedCategory = normalizeTextKey(payload.category || 'General') || 'general';
      const normalizedUnit = normalizeText(payload.unit || 'Unidad') || 'Unidad';
      const normalizedName = normalizeText(payload.name || '');

      if (!supplierId) {
        const name = normalizeText(payload.newSupplier?.name || '');
        const phone = normalizePhone(payload.newSupplier?.phone || '');
        const email = normalizeEmail(payload.newSupplier?.email || '');
        if (!validatePhone(phone)) throw new AppError('VALIDATION_ERROR', 'Telefono de proveedor invalido. Usa formato chileno +56...', 400);
        if (!validateEmail(email)) throw new AppError('VALIDATION_ERROR', 'Correo de proveedor invalido.', 400);
        const existingRow = (await tx.select({ id: suppliers.id, name: suppliers.name }).from(suppliers)).find(
          (row) => normalizeTextKey(row.name) === normalizeTextKey(name),
        );

        if (existingRow?.id) {
          supplierId = existingRow.id;
        } else {
          const insertedSupplier = await tx
            .insert(suppliers)
            .values({
              name,
              contact: normalizeText(payload.newSupplier?.contact || ''),
              phone,
              email,
              status: 'Activo',
            })
            .returning({ id: suppliers.id, name: suppliers.name });
          supplierId = insertedSupplier[0].id;
        }
      }

      const initialTransportUnit = Math.max(0, Number(payload.initialPurchase.transportUnit) || 0);
      const initialUnitCost = Math.max(0, Number(payload.initialPurchase.unitCost) || 0);
      const initialQuantity = Math.max(1, Math.round(Number(payload.initialPurchase.quantity) || 1));
      const finalCost = initialUnitCost + initialTransportUnit;

      const insertedProduct = await tx
        .insert(products)
        .values({
          sku: payload.sku,
          supplierId,
          name: normalizedName,
          category: normalizedCategory,
          barcode: normalizeText(payload.barcode || ''),
          brand: normalizeText(payload.brand || ''),
          unit: normalizedUnit,
          stock: initialQuantity,
          stockMin: Math.max(0, Math.round(Number(payload.stockMin) || 0)),
          purchaseCost: String(Math.max(0, Number(payload.purchaseCost) || initialUnitCost)),
          transportUnit: String(Math.max(0, Number(payload.transportUnit) || initialTransportUnit)),
          finalCost: String(finalCost),
          location: normalizeText(payload.location || ''),
          basePrice: String(Math.max(0, Number(payload.basePrice) || 0)),
          status: payload.status || 'Activo',
        })
        .returning({ id: products.id, sku: products.sku, name: products.name });

      const productId = insertedProduct[0].id;

      await tx.insert(purchases).values({
        supplierId,
        productId,
        quantity: initialQuantity,
        date: new Date(),
          purchaseOrder: normalizeText(payload.initialPurchase.purchaseOrder || ''),
        unitCost: String(initialUnitCost),
        transportUnit: String(initialTransportUnit),
        totalCost: String(initialQuantity * (initialUnitCost + initialTransportUnit)),
        reception: payload.initialPurchase.reception || 'Recibido',
          doc: normalizeText(payload.initialPurchase.doc || ''),
          observation: normalizeText(payload.initialPurchase.observation || ''),
      });

      return { supplierId, productId, sku: insertedProduct[0].sku, product: insertedProduct[0].name };
    });

    return created;
  },
  update: async (id: string, payload: UpdateProductPayload) => {
    const currentRow = await db
      .select()
      .from(products)
      .where(isUuid(id) ? or(eq(products.id, id), eq(products.sku, id)) : eq(products.sku, id))
      .limit(1);
    const current = currentRow[0];
    if (!current) return null;

    const nextPurchaseCost = payload.purchaseCost !== undefined ? Math.max(0, Number(payload.purchaseCost) || 0) : numberValue(current.purchaseCost);
    const nextTransportUnit = payload.transportUnit !== undefined ? Math.max(0, Number(payload.transportUnit) || 0) : numberValue(current.transportUnit);

    const values: Partial<typeof products.$inferInsert> = { updatedAt: sql`now()` as unknown as Date };
    if (payload.name !== undefined) values.name = normalizeText(payload.name);
    if (payload.category !== undefined) values.category = normalizeTextKey(payload.category);
    if (payload.stock !== undefined) values.stock = Math.max(0, Math.round(Number(payload.stock) || 0));
    if (payload.stockMin !== undefined) values.stockMin = Math.max(0, Math.round(Number(payload.stockMin) || 0));
    if (payload.basePrice !== undefined || payload.salePriceBase !== undefined) values.basePrice = String(Math.max(0, Number(payload.basePrice ?? payload.salePriceBase) || 0));
    if (payload.status !== undefined) values.status = payload.status;
    if (payload.barcode !== undefined) values.barcode = normalizeText(payload.barcode);
    if (payload.brand !== undefined) values.brand = normalizeText(payload.brand);
    if (payload.unit !== undefined) values.unit = normalizeText(payload.unit);
    if (payload.purchaseCost !== undefined) values.purchaseCost = String(nextPurchaseCost);
    if (payload.transportUnit !== undefined) values.transportUnit = String(nextTransportUnit);
    if (payload.purchaseCost !== undefined || payload.transportUnit !== undefined) values.finalCost = String(nextPurchaseCost + nextTransportUnit);
    if (payload.location !== undefined) values.location = normalizeText(payload.location);
    if (payload.supplierId !== undefined) values.supplierId = payload.supplierId || null;

    const row = await db.update(products).set(values).where(eq(products.id, current.id)).returning();
    return row[0] ? toProduct(row[0]) : null;
  },
  remove: async (id: string) => {
    return db.transaction(async (tx) => {
      const row = await tx
        .select({ id: products.id, sku: products.sku })
        .from(products)
        .where(isUuid(id) ? or(eq(products.id, id), eq(products.sku, id)) : eq(products.sku, id))
        .limit(1);
      const product = row[0];
      if (!product) {
        return { deleted: true, id };
      }

      await tx.update(purchases).set({ productId: null, updatedAt: sql`now()` }).where(eq(purchases.productId, product.id));
      await tx.update(orderItems).set({ productId: null, updatedAt: sql`now()` }).where(eq(orderItems.productId, product.id));
      await tx.update(quoteItems).set({ productId: null, updatedAt: sql`now()` }).where(eq(quoteItems.productId, product.id));

      await tx.delete(products).where(eq(products.id, product.id));
      return { deleted: true, id: product.sku };
    });
  },
};
