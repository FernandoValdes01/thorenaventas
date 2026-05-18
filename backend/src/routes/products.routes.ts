import { Hono } from 'hono';
import { fail, ok } from '../lib/http';
import { productsService } from '../services/products.service';
import { createProductWithInitialPurchaseSchema, updateProductBodySchema } from '../validators/products.schema';

export const productsRoutes = new Hono()
  .get('/', async (c) => ok(c, await productsService.list()))
  .get('/sku/:sku', async (c) => ok(c, await productsService.getBySku(c.req.param('sku'))))
  .get('/:id', async (c) => ok(c, await productsService.getById(c.req.param('id'))))
  .post('/', async (c) => {
    const body = await c.req.json();
    const parsed = createProductWithInitialPurchaseSchema.safeParse(body);
    if (!parsed.success) {
      return fail(c, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Producto invalido.', 400);
    }

    const created = await productsService.createWithInitialPurchase(parsed.data);
    return ok(c, { created: true, payload: created }, 201);
  })
  .patch('/:id', async (c) => {
    const body = await c.req.json();
    const parsed = updateProductBodySchema.safeParse(body);
    if (!parsed.success) {
      return fail(c, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Actualizacion invalida.', 400);
    }

    return ok(c, await productsService.update(c.req.param('id'), parsed.data));
  })
  .delete('/:id', async (c) => ok(c, await productsService.remove(c.req.param('id'))));
