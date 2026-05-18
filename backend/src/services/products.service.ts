import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { products, purchases, suppliers } from '../db/schema';
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
  purchaseCost?: number;
  transportUnit?: number;
  location?: string;
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

export const productsService = {
  list: async () => {
    const rows = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        category: products.category,
        stock: products.stock,
        stockMin: products.stockMin,
        basePrice: products.basePrice,
      })
      .from(products);

    return rows.map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      category: row.category,
      stock: Number(row.stock) || 0,
      stockMin: Number(row.stockMin) || 0,
      basePrice: Number(row.basePrice) || 0,
      offer: { mode: 'none', discountPercent: 0, endDate: '' },
    }));
  },
  getById: async (id: string) => {
    const row = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        category: products.category,
        stock: products.stock,
        stockMin: products.stockMin,
        basePrice: products.basePrice,
      })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    if (!row[0]) return detailStub('products', id);
    return {
      ...row[0],
      stock: Number(row[0].stock) || 0,
      stockMin: Number(row[0].stockMin) || 0,
      basePrice: Number(row[0].basePrice) || 0,
      offer: { mode: 'none', discountPercent: 0, endDate: '' },
    };
  },
  createWithInitialPurchase: async (payload: CreateProductPayload) => {
    const created = await db.transaction(async (tx) => {
      let supplierId = payload.supplierId || '';

      if (!supplierId) {
        const name = String(payload.newSupplier?.name || '').trim();
        const existingByName = await tx
          .select({ id: suppliers.id })
          .from(suppliers)
          .where(eq(sql`lower(${suppliers.name})`, name.toLowerCase()))
          .limit(1);

        if (existingByName[0]?.id) {
          supplierId = existingByName[0].id;
        } else {
          const insertedSupplier = await tx
            .insert(suppliers)
            .values({
              name,
              contact: payload.newSupplier?.contact || '',
              phone: payload.newSupplier?.phone || '',
              email: payload.newSupplier?.email || '',
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
          name: payload.name,
          category: payload.category,
          barcode: payload.barcode || '',
          brand: payload.brand || '',
          unit: payload.unit || 'Unidad',
          stock: initialQuantity,
          stockMin: 0,
          purchaseCost: String(Math.max(0, Number(payload.purchaseCost) || initialUnitCost)),
          transportUnit: String(Math.max(0, Number(payload.transportUnit) || initialTransportUnit)),
          finalCost: String(finalCost),
          location: payload.location || '',
          basePrice: String(Math.max(0, Number(payload.basePrice) || 0)),
          status: 'Activo',
        })
        .returning({ id: products.id, sku: products.sku, name: products.name });

      const productId = insertedProduct[0].id;

      await tx.insert(purchases).values({
        supplierId,
        productId,
        quantity: initialQuantity,
        date: new Date(),
        purchaseOrder: payload.initialPurchase.purchaseOrder || '',
        unitCost: String(initialUnitCost),
        transportUnit: String(initialTransportUnit),
        totalCost: String(initialQuantity * (initialUnitCost + initialTransportUnit)),
        reception: payload.initialPurchase.reception || 'Recibido',
        doc: payload.initialPurchase.doc || '',
        observation: payload.initialPurchase.observation || '',
      });

      return { supplierId, productId, sku: insertedProduct[0].sku, product: insertedProduct[0].name };
    });

    return created;
  },
};
