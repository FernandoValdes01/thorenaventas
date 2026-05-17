import { Hono } from 'hono';
import { ok } from '../lib/http';
import { productsService } from '../services/products.service';

export const productsRoutes = new Hono()
  .get('/', (c) => ok(c, productsService.list()))
  .get('/:id', (c) => ok(c, productsService.getById(c.req.param('id'))))
  .get('/sku/:sku', (c) => ok(c, { sku: c.req.param('sku'), source: 'stub' }))
  .post('/', (c) => ok(c, { created: true }, 201))
  .patch('/:id', (c) => ok(c, { updated: true, id: c.req.param('id') }))
  .delete('/:id', (c) => ok(c, { deleted: true, id: c.req.param('id') }));
