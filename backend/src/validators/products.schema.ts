import { z } from 'zod';

export const productBodySchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  supplierId: z.string().uuid(),
  stock: z.number().int().min(0).default(0),
  basePrice: z.number().min(0).default(0),
});

export const createProductWithInitialPurchaseSchema = z
  .object({
    sku: z.string().min(1),
    name: z.string().min(1),
    category: z.string().min(1),
    unit: z.string().min(1).default('Unidad'),
    basePrice: z.number().min(0).default(0),
    supplierId: z.string().uuid().optional(),
    newSupplier: z
      .object({
        name: z.string().min(1),
        contact: z.string().default(''),
        phone: z.string().default(''),
        email: z.string().default(''),
      })
      .optional(),
    initialPurchase: z.object({
      quantity: z.number().int().min(1),
      unitCost: z.number().min(0),
      transportUnit: z.number().min(0).default(0),
      purchaseOrder: z.string().default(''),
      doc: z.string().default(''),
      reception: z.enum(['Recibido', 'Pendiente', 'Con observacion']).default('Recibido'),
      observation: z.string().default(''),
    }),
  })
  .refine((value) => Boolean(value.supplierId || value.newSupplier), {
    message: 'Debes indicar supplierId o newSupplier.',
    path: ['supplierId'],
  });
