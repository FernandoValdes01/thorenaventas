import { Hono } from 'hono';
import { ok } from '../lib/http';
import { authService } from '../services/auth.service';

export const authRoutes = new Hono()
  .post('/login', async (c) => {
    const body = await c.req.json<{ email: string }>();
    const session = await authService.login(body.email);
    return ok(c, session);
  })
  .post('/logout', async (c) => ok(c, await authService.logout()))
  .get('/session', async (c) => ok(c, await authService.session()));
