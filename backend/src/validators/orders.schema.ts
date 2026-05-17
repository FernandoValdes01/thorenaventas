import { z } from 'zod';

export const orderBodySchema = z.object({
  clientId: z.string().uuid().optional(),
  saleChannel: z.enum(['terreno', 'online', 'oficina']),
  paymentMethod: z.string().min(1),
  status: z.string().default('Pedido'),
  observations: z.string().default(''),
});

export const updateOrderStatusSchema = z.object({
  status: z.string().min(1),
});
