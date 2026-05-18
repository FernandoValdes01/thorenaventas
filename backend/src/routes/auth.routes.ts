import { Hono } from 'hono';
import type { Context } from 'hono';
import { auth } from '../lib/auth';

const authHandler = async (c: Context) => auth.handler(c.req.raw);

export const authRoutes = new Hono().all('/', authHandler).all('/*', authHandler);
