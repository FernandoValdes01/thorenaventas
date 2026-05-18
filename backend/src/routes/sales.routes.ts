import { Hono } from 'hono';
import { ok } from '../lib/http';
import { salesService } from '../services/sales.service';

export const salesRoutes = new Hono()
  .get('/', async (c) => ok(c, await salesService.list()))
  .post('/', async (c) => ok(c, await salesService.create(await c.req.json()), 201))
  .patch('/:id', async (c) => ok(c, await salesService.update(c.req.param('id'), await c.req.json())));
