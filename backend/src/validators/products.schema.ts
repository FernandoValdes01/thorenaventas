import { z } from 'zod';

export const productBodySchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  stock: z.number().int().min(0).default(0),
  basePrice: z.number().min(0).default(0),
});
