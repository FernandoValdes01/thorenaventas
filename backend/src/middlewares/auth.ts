import type { Context, Next } from 'hono';
import { auth } from '../lib/auth';
import { fail } from '../lib/http';

export async function authMiddleware(c: Context, next: Next) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.session || !session?.user) {
    return fail(c, 'UNAUTHORIZED', 'Debes iniciar sesion.', 401);
  }

  const role = session.user.email === 'admin@thorena.cl' ? 'admin' : 'vendedor';
  c.set('user', { ...session.user, role });
  await next();
}
