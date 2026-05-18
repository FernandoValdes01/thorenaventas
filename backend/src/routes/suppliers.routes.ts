import { Hono } from 'hono';
import { fail, ok } from '../lib/http';
import { suppliersService } from '../services/suppliers.service';
import { supplierBodySchema, updateSupplierBodySchema } from '../validators/suppliers.schema';

export const suppliersRoutes = new Hono()
  .get('/', async (c) => ok(c, await suppliersService.list()))
  .get('/:id', async (c) => ok(c, await suppliersService.getById(c.req.param('id'))))
  .post('/', async (c) => {
    const body = await c.req.json();
    const parsed = supplierBodySchema.safeParse(body);
    if (!parsed.success) {
      return fail(c, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Proveedor invalido.', 400);
    }

    return ok(c, await suppliersService.create(parsed.data), 201);
  })
  .patch('/:id', async (c) => {
    const body = await c.req.json();
    const parsed = updateSupplierBodySchema.safeParse(body);
    if (!parsed.success) {
      return fail(c, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Actualizacion invalida.', 400);
    }

    return ok(c, await suppliersService.update(c.req.param('id'), parsed.data));
  });
