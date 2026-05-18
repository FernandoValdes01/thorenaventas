import { z } from 'zod';

export const supplierBodySchema = z.object({
  name: z.string().min(1),
  contact: z.string().default(''),
  phone: z.string().default(''),
  email: z.string().default(''),
  status: z.enum(['Activo', 'Inactivo']).default('Activo'),
  notes: z.string().default(''),
});

export const updateSupplierBodySchema = supplierBodySchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'Debes enviar al menos un campo para actualizar.',
});
