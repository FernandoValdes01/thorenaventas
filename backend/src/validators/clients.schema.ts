import { z } from 'zod';

export const clientBodySchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1),
  businessName: z.string().default(''),
  nickname: z.string().default(''),
  type: z.string().min(1),
  rut: z.string().default(''),
  phone: z.string().default(''),
  whatsapp: z.string().default(''),
  contact: z.string().default(''),
  email: z.string().default(''),
  instagram: z.string().default(''),
  address: z.string().default(''),
  zone: z.string().default(''),
  sector: z.string().default(''),
  frequency: z.string().default('Semanal'),
  creditEnabled: z.boolean().default(false),
  debt: z.number().min(0).default(0),
  monthlyTarget: z.number().min(0).default(0),
  accumulatedSales: z.number().min(0).default(0),
  goalProgress: z.number().min(0).max(1).default(0),
  creditLimit: z.number().min(0).default(0),
  status: z.string().default('Activo'),
  notes: z.string().default(''),
  observations: z.string().default(''),
  lastPurchase: z.string().optional(),
});

export const updateClientBodySchema = clientBodySchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'Debes enviar al menos un campo para actualizar.',
});
