import { Hono } from 'hono';
import { ok } from '../lib/http';
import { clientsService } from '../services/clients.service';

export const clientsRoutes = new Hono()
  .get('/', (c) => ok(c, clientsService.list()))
  .get('/:id', (c) => ok(c, clientsService.getById(c.req.param('id'))))
  .post('/', (c) => ok(c, { created: true }, 201))
  .patch('/:id', (c) => ok(c, { updated: true, id: c.req.param('id') }))
  .delete('/:id', (c) => ok(c, { deleted: true, id: c.req.param('id') }));
