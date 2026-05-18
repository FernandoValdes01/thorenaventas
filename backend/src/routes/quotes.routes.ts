import { Hono } from 'hono';
import { ok } from '../lib/http';
import { quotesService } from '../services/quotes.service';

export const quotesRoutes = new Hono()
  .get('/', (c) => ok(c, quotesService.list()))
  .get('/:id', (c) => ok(c, quotesService.getById(c.req.param('id'))))
  .post('/', (c) => ok(c, { created: true }, 201))
  .patch('/:id', (c) => ok(c, { updated: true, id: c.req.param('id') }))
  .post('/:id/convert-to-order', (c) => ok(c, { converted: true, id: c.req.param('id') }));
