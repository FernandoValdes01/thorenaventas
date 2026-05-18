import { z } from 'zod';

export const quoteBodySchema = z.object({
  clientId: z.string().uuid().optional(),
  status: z.string().default('Cotizado'),
});
