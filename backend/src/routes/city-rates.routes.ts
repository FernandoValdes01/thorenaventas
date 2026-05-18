import { Hono } from 'hono';
import { ok } from '../lib/http';
import { cityRatesService } from '../services/city-rates.service';

export const cityRatesRoutes = new Hono()
  .get('/', async (c) => ok(c, await cityRatesService.list()))
  .post('/', async (c) => ok(c, await cityRatesService.create(await c.req.json()), 201))
  .patch('/:id', async (c) => ok(c, await cityRatesService.update(c.req.param('id'), await c.req.json())))
  .delete('/:id', async (c) => ok(c, await cityRatesService.remove(c.req.param('id'))));
