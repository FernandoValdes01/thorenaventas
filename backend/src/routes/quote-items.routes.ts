import { Hono } from 'hono';
import { ok } from '../lib/http';

export const quoteItemsRoutes = new Hono()
  .get('/quotes/:quoteId/items', (c) => ok(c, { quoteId: c.req.param('quoteId'), items: [], source: 'stub' }))
  .post('/quotes/:quoteId/items', (c) => ok(c, { created: true, quoteId: c.req.param('quoteId') }, 201))
  .patch('/quote-items/:id', (c) => ok(c, { updated: true, id: c.req.param('id') }))
  .delete('/quote-items/:id', (c) => ok(c, { deleted: true, id: c.req.param('id') }));
