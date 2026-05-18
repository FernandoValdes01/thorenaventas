import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth/minimal';
import { db } from '../db/client';
import * as schema from '../db/schema';
import { env } from './env';
import { trustedOrigins } from './origins';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  basePath: '/api/v1/auth',
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
});
