import { api } from '../lib/api';
import type { BetterAuthSessionPayload } from '../types/auth';

type RetryableResponse<T> = Awaited<ReturnType<typeof api.post<T>>>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(request: () => Promise<RetryableResponse<T>>, attempts = 3) {
  let last = await request();
  for (let attempt = 2; attempt <= attempts; attempt += 1) {
    if (last.success) return last;
    const retryable = last.error.code === 'NETWORK_ERROR' || last.error.code === 'HTTP_ERROR' || last.error.code === 'SERVER_ERROR';
    if (!retryable) return last;
    await sleep(300 * (attempt - 1));
    last = await request();
  }
  return last;
}

export const authService = {
  login: (email: string, password: string) => withRetry(() => api.post<BetterAuthSessionPayload>('/api/v1/auth/sign-in/email', { email, password })),
  signUp: (name: string, email: string, password: string) =>
    withRetry(() => api.post<BetterAuthSessionPayload>('/api/v1/auth/sign-up/email', { name, email, password })),
  logout: () => api.post<{ success: boolean }>('/api/v1/auth/sign-out'),
  getSession: () => withRetry(() => api.get<BetterAuthSessionPayload | null>('/api/v1/auth/get-session'), 2),
};
