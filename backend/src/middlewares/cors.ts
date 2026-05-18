import { cors } from 'hono/cors';
import { trustedOrigins } from '../lib/origins';

export const corsMiddleware = cors({
  origin: trustedOrigins,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
});
