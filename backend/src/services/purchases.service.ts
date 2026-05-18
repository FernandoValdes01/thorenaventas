import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { products, purchases, suppliers } from '../db/schema';

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

export const purchasesService = {
  create: async (payload: PurchasePayload) => {
    return db.transaction(async (tx) => {
      let supplierId = payload.supplierId || '';

      if (!supplierId) {
        const supplierName = String(payload.supplierName || '').trim();
        const existingSupplier = await tx
          .select({ id: suppliers.id })
          .from(suppliers)
          .where(eq(sql`lower(${suppliers.name})`, supplierName.toLowerCase()))
          .limit(1);

        if (existingSupplier[0]?.id) {
          supplierId = existingSupplier[0].id;
        } else {
          const inserted = await tx
            .insert(suppliers)
            .values({ name: supplierName, status: 'Activo' })
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
            purchaseOrder: payload.purchaseOrder || '',
            quantity,
            unitCost: String(unitCost),
            transportUnit: String(transportUnit),
            totalCost: String(quantity * (unitCost + transportUnit)),
            reception: payload.reception || 'Recibido',
            doc: payload.doc || '',
            observation: payload.observation || '',
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
};
