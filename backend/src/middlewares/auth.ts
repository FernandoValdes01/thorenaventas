import type { Context, Next } from 'hono';
import { fail } from '../lib/http';

export async function authMiddleware(c: Context, next: Next) {
  const authorization = c.req.header('Authorization');

  if (!authorization) {
    return fail(c, 'UNAUTHORIZED', 'Debes iniciar sesion.', 401);
  }

  await next();
}
