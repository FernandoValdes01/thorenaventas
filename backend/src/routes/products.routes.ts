import { Hono } from 'hono';
import { fail, ok } from '../lib/http';
import { productsService } from '../services/products.service';
import { createProductWithInitialPurchaseSchema } from '../validators/products.schema';

export const productsRoutes = new Hono()
  .get('/', async (c) => ok(c, await productsService.list()))
  .get('/:id', async (c) => ok(c, await productsService.getById(c.req.param('id'))))
  .get('/sku/:sku', (c) => ok(c, { sku: c.req.param('sku'), source: 'stub' }))
  .post('/', async (c) => {
    const body = await c.req.json();
    const parsed = createProductWithInitialPurchaseSchema.safeParse(body);
    if (!parsed.success) {
      return fail(c, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Producto invalido.', 400);
    }

    const created = await productsService.createWithInitialPurchase(parsed.data);
    return ok(c, { created: true, payload: created }, 201);
  })
  .patch('/:id', (c) => ok(c, { updated: true, id: c.req.param('id') }))
  .delete('/:id', (c) => ok(c, { deleted: true, id: c.req.param('id') }));
