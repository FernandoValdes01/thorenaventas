import { z } from 'zod';

export const productBodySchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  supplierId: z.string().uuid().optional(),
  stock: z.number().int().min(0).default(0),
  stockMin: z.number().int().min(0).default(0),
  basePrice: z.number().min(0).default(0),
  status: z.enum(['Activo', 'Inactivo']).default('Activo'),
});

export const createProductWithInitialPurchaseSchema = z
  .object({
    sku: z.string().min(1),
    name: z.string().min(1),
    category: z.string().min(1),
    unit: z.string().min(1).default('Unidad'),
    basePrice: z.number().min(0).default(0),
    stockMin: z.number().int().min(0).default(0),
    barcode: z.string().default(''),
    brand: z.string().default(''),
    purchaseCost: z.number().min(0).default(0),
    transportUnit: z.number().min(0).default(0),
    location: z.string().default(''),
    status: z.enum(['Activo', 'Inactivo']).default('Activo'),
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

export const updateProductBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    stock: z.number().int().min(0).optional(),
    stockMin: z.number().int().min(0).optional(),
    basePrice: z.number().min(0).optional(),
    salePriceBase: z.number().min(0).optional(),
    status: z.enum(['Activo', 'Inactivo']).optional(),
    barcode: z.string().optional(),
    brand: z.string().optional(),
    unit: z.string().min(1).optional(),
    purchaseCost: z.number().min(0).optional(),
    transportUnit: z.number().min(0).optional(),
    location: z.string().optional(),
    supplierId: z.string().uuid().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar.',
  });
