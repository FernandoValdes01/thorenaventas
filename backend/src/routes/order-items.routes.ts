import { Hono } from 'hono';
import { ok } from '../lib/http';

export const orderItemsRoutes = new Hono()
  .get('/orders/:orderId/items', (c) => ok(c, { orderId: c.req.param('orderId'), items: [], source: 'stub' }))
  .post('/orders/:orderId/items', (c) => ok(c, { created: true, orderId: c.req.param('orderId') }, 201))
  .patch('/order-items/:id', (c) => ok(c, { updated: true, id: c.req.param('id') }))
  .delete('/order-items/:id', (c) => ok(c, { deleted: true, id: c.req.param('id') }));
