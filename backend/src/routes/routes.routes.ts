import { Hono } from 'hono';
import { ok } from '../lib/http';
import { routesService } from '../services/routes.service';

export const routesRoutes = new Hono()
  .get('/', async (c) => ok(c, await routesService.list()))
  .post('/', async (c) => ok(c, await routesService.create(await c.req.json()), 201))
  .patch('/:id', async (c) => ok(c, await routesService.update(c.req.param('id'), await c.req.json())));
