import { Hono } from 'hono';
import { ok } from '../lib/http';
import { volumeScalesService } from '../services/volume-scales.service';

export const volumeScalesRoutes = new Hono()
  .get('/', async (c) => ok(c, await volumeScalesService.list()))
  .post('/', async (c) => ok(c, await volumeScalesService.create(await c.req.json()), 201))
  .patch('/:id', async (c) => ok(c, await volumeScalesService.update(c.req.param('id'), await c.req.json())))
  .delete('/:id', async (c) => ok(c, await volumeScalesService.remove(c.req.param('id'))));
