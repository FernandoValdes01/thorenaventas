import type { Context, Next } from 'hono';
import { fail } from '../lib/http';

export function requireRole(roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as { role?: string } | undefined;
    const role = user?.role || '';

    if (!roles.includes(role)) {
      return fail(c, 'FORBIDDEN', 'No tienes permisos para esta accion.', 403);
    }

    await next();
  };
}
