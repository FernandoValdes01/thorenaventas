import { z } from 'zod';

export const quoteItemBodySchema = z.object({
  productId: z.string().uuid().optional(),
  productNameSnapshot: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
});
