import type { Context, Next } from 'hono';
import { AppError } from '../lib/errors';
import { fail } from '../lib/http';

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return fail(c, error.code, error.message, error.status);
    }
    return fail(c, 'INTERNAL_ERROR', 'Error interno del servidor.', 500);
  }
}
