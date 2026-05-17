import { Hono } from 'hono';
import { ok } from '../lib/http';

export const routesRoutes = new Hono()
  .get('/', (c) => ok(c, { items: [], source: 'stub' }))
  .get('/:id', (c) => ok(c, { id: c.req.param('id'), source: 'stub' }))
  .post('/', (c) => ok(c, { created: true }, 201))
  .patch('/:id', (c) => ok(c, { updated: true, id: c.req.param('id') }));
