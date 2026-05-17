import { Hono } from 'hono';
import { ok } from '../lib/http';

export const cityRatesRoutes = new Hono()
  .get('/', (c) => ok(c, { items: [], source: 'stub' }))
  .post('/', (c) => ok(c, { created: true }, 201))
  .patch('/:id', (c) => ok(c, { updated: true, id: c.req.param('id') }));
