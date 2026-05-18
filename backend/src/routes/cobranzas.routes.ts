import { Hono } from 'hono';
import { ok } from '../lib/http';
import { cobranzasService } from '../services/cobranzas.service';

export const cobranzasRoutes = new Hono()
  .get('/', async (c) => ok(c, await cobranzasService.list()))
  .post('/', async (c) => ok(c, await cobranzasService.create(await c.req.json()), 201))
  .patch('/:id', async (c) => ok(c, await cobranzasService.update(c.req.param('id'), await c.req.json())))
  .patch('/:id/status', async (c) => ok(c, await cobranzasService.update(c.req.param('id'), await c.req.json())))
  .delete('/:id', async (c) => ok(c, await cobranzasService.remove(c.req.param('id'))));
