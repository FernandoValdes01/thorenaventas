import { z } from 'zod';

const purchaseItemSchema = z.object({
  productId: z.string().uuid().optional(),
  productSku: z.string().min(1),
  quantity: z.number().int().min(1),
  unitCost: z.number().min(0),
  transportUnit: z.number().min(0).default(0),
});

export const purchaseBodySchema = z.object({
  supplierId: z.string().uuid().optional(),
  supplierName: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  purchaseOrder: z.string().default(''),
  reception: z.enum(['Recibido', 'Pendiente', 'Con observacion']).default('Recibido'),
  doc: z.string().default(''),
  observation: z.string().default(''),
  items: z.array(purchaseItemSchema).min(1),
}).refine((value) => Boolean(value.supplierId || value.supplierName), {
  message: 'Debes indicar supplierId o supplierName.',
  path: ['supplierId'],
});

export const updatePurchaseBodySchema = z.object({
  reception: z.enum(['Recibido', 'Pendiente', 'Con observacion']).optional(),
  doc: z.string().optional(),
  observation: z.string().optional(),
});
