import { Hono } from 'hono';
import { fail, ok } from '../lib/http';
import { purchaseBodySchema, updatePurchaseBodySchema } from '../validators/purchases.schema';

export const purchasesRoutes = new Hono()
  .get('/', (c) => ok(c, { items: [], source: 'stub' }))
  .get('/:id', (c) => ok(c, { id: c.req.param('id'), source: 'stub' }))
  .post('/', async (c) => {
    const body = await c.req.json();
    const parsed = purchaseBodySchema.safeParse(body);
    if (!parsed.success) {
      return fail(c, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Compra invalida.', 400);
    }

    return ok(c, { created: true, payload: parsed.data }, 201);
  })
  .patch('/:id', async (c) => {
    const body = await c.req.json();
    const parsed = updatePurchaseBodySchema.safeParse(body);
    if (!parsed.success) {
      return fail(c, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Actualizacion invalida.', 400);
    }

    return ok(c, { updated: true, id: c.req.param('id'), payload: parsed.data });
  });
