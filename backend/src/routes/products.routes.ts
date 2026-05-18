import { Hono } from 'hono';
import { fail, ok } from '../lib/http';
import { productsService } from '../services/products.service';
import { createProductWithInitialPurchaseSchema } from '../validators/products.schema';

export const productsRoutes = new Hono()
  .get('/', (c) => ok(c, productsService.list()))
  .get('/:id', (c) => ok(c, productsService.getById(c.req.param('id'))))
  .get('/sku/:sku', (c) => ok(c, { sku: c.req.param('sku'), source: 'stub' }))
  .post('/', async (c) => {
    const body = await c.req.json();
    const parsed = createProductWithInitialPurchaseSchema.safeParse(body);
    if (!parsed.success) {
      return fail(c, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Producto invalido.', 400);
    }

    return ok(c, { created: true, payload: parsed.data }, 201);
  })
  .patch('/:id', (c) => ok(c, { updated: true, id: c.req.param('id') }))
  .delete('/:id', (c) => ok(c, { deleted: true, id: c.req.param('id') }));
