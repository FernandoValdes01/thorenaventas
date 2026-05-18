import { Hono } from 'hono';
import { fail, ok } from '../lib/http';
import { ordersService } from '../services/orders.service';
import { orderBodySchema, updateOrderStatusSchema } from '../validators/orders.schema';

export const ordersRoutes = new Hono()
  .get('/', async (c) => ok(c, await ordersService.list()))
  .get('/code/:code', async (c) => ok(c, await ordersService.getById(c.req.param('code'))))
  .get('/:id', async (c) => ok(c, await ordersService.getById(c.req.param('id'))))
  .post('/', async (c) => {
    const body = await c.req.json();
    const parsed = orderBodySchema.safeParse(body);
    if (!parsed.success) {
      return fail(c, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Pedido invalido.', 400);
    }

    try {
      return ok(c, await ordersService.create(parsed.data), 201);
    } catch (error) {
      return fail(c, 'ORDER_CREATE_FAILED', error instanceof Error ? error.message : 'No se pudo crear el pedido.', 400);
    }
  })
  .patch('/:id/status', async (c) => {
    const body = await c.req.json();
    const parsed = updateOrderStatusSchema.safeParse(body);
    if (!parsed.success) {
      return fail(c, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Estado invalido.', 400);
    }

    return ok(c, await ordersService.updateStatus(c.req.param('id'), parsed.data.status));
  })
  .patch('/:id', (c) => ok(c, { updated: true, id: c.req.param('id') }))
  .delete('/:id', (c) => ok(c, { deleted: true, id: c.req.param('id') }));
