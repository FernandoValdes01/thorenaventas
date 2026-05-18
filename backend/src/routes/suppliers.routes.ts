import { Hono } from 'hono';
import { fail, ok } from '../lib/http';
import { updateSupplierBodySchema } from '../validators/suppliers.schema';

export const suppliersRoutes = new Hono()
  .get('/', (c) => ok(c, { items: [], source: 'stub' }))
  .get('/:id', (c) => ok(c, { id: c.req.param('id'), source: 'stub' }))
  .post('/', (c) => fail(c, 'FLOW_DISABLED', 'Crea proveedores desde el flujo de alta de producto con compra inicial.', 400))
  .patch('/:id', async (c) => {
    const body = await c.req.json();
    const parsed = updateSupplierBodySchema.safeParse(body);
    if (!parsed.success) {
      return fail(c, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Actualizacion invalida.', 400);
    }

    return ok(c, { updated: true, id: c.req.param('id'), payload: parsed.data });
  });
