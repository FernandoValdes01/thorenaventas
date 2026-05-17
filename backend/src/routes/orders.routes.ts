import { Hono } from 'hono';
import { ok } from '../lib/http';
import { ordersService } from '../services/orders.service';

export const ordersRoutes = new Hono()
  .get('/', (c) => ok(c, ordersService.list()))
  .get('/:id', (c) => ok(c, ordersService.getById(c.req.param('id'))))
  .get('/code/:code', (c) => ok(c, { code: c.req.param('code'), source: 'stub' }))
  .post('/', (c) => ok(c, { created: true }, 201))
  .patch('/:id', (c) => ok(c, { updated: true, id: c.req.param('id') }))
  .patch('/:id/status', (c) => ok(c, { updatedStatus: true, id: c.req.param('id') }))
  .delete('/:id', (c) => ok(c, { deleted: true, id: c.req.param('id') }));
