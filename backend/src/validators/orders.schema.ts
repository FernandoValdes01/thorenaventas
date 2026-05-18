import { z } from 'zod';

export const orderBodySchema = z.object({
  code: z.string().optional(),
  createdAt: z.string().optional(),
  clientId: z.string().optional(),
  customerName: z.string().default(''),
  customerRut: z.string().default(''),
  customerNumber: z.string().default(''),
  contactPhone: z.string().default(''),
  deliveryAddress: z.string().default(''),
  saleChannel: z.enum(['terreno', 'online', 'oficina']),
  paymentMethod: z.string().min(1),
  status: z.string().default('Pedido'),
  subtotalBeforeDiscount: z.number().min(0).default(0),
  totalDiscountAmount: z.number().min(0).default(0),
  itemsTotal: z.number().min(0).default(0),
  dispatchCity: z.string().default(''),
  dispatchRate: z.number().min(0).max(0.95).default(0),
  dispatchSurcharge: z.number().min(0).default(0),
  total: z.number().min(0).default(0),
  observations: z.string().default(''),
  sellerName: z.string().default(''),
  sellerRut: z.string().default(''),
  showReceipt: z.boolean().default(false),
  clientSnapshot: z
    .object({
      id: z.string().default(''),
      name: z.string().default(''),
      type: z.string().default(''),
      zone: z.string().default(''),
      sector: z.string().default(''),
      creditEnabled: z.boolean().default(false),
      debt: z.number().min(0).default(0),
    })
    .nullable()
    .optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    productName: z.string().min(1),
    quantity: z.number().int().min(1),
    basePrice: z.number().min(0).default(0),
    offerDiscountPercent: z.number().min(0).default(0),
    unitPriceBeforeScale: z.number().min(0).default(0),
    unitPrice: z.number().min(0),
    volumeScaleId: z.string().default(''),
    volumeScaleLabel: z.string().default('Sin escala'),
    volumeDiscountRate: z.number().min(0).max(0.95).default(0),
    volumeDiscountPercent: z.number().min(0).default(0),
    subtotalBeforeScale: z.number().min(0).default(0),
    discountAmount: z.number().min(0).default(0),
    subtotal: z.number().min(0),
  })).min(1),
});

export const updateOrderStatusSchema = z.object({
  status: z.string().min(1),
});
