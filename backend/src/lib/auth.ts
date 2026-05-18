import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth/minimal';
import { db } from '../db/client';
import * as schema from '../db/schema';
import { env } from './env';
import { trustedOrigins } from './origins';

export const AUTH_BASE_PATH = '/api/v1/auth';

function getBetterAuthBaseURL(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: getBetterAuthBaseURL(env.BETTER_AUTH_URL),
  basePath: AUTH_BASE_PATH,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
});
