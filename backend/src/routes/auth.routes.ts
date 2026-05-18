import { Hono } from 'hono';
import { auth } from '../lib/auth';

export const authRoutes = new Hono().all('/*', async (c) => auth.handler(c.req.raw));
