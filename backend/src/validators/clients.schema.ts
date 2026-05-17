import { z } from 'zod';

export const clientBodySchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  status: z.string().default('Activo'),
});
