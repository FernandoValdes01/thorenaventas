import { Hono } from 'hono';
import { fail, ok } from '../lib/http';
import { clientsService } from '../services/clients.service';
import { clientBodySchema, updateClientBodySchema } from '../validators/clients.schema';

export const clientsRoutes = new Hono()
  .get('/', async (c) => ok(c, await clientsService.list()))
  .get('/:id', async (c) => ok(c, await clientsService.getById(c.req.param('id'))))
  .post('/', async (c) => {
    const body = await c.req.json();
    const parsed = clientBodySchema.safeParse(body);
    if (!parsed.success) {
      return fail(c, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Cliente invalido.', 400);
    }

    return ok(c, await clientsService.create(parsed.data), 201);
  })
  .patch('/:id', async (c) => {
    const body = await c.req.json();
    const parsed = updateClientBodySchema.safeParse(body);
    if (!parsed.success) {
      return fail(c, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Actualizacion invalida.', 400);
    }

    return ok(c, await clientsService.update(c.req.param('id'), parsed.data));
  })
  .delete('/:id', async (c) => ok(c, await clientsService.remove(c.req.param('id'))));
