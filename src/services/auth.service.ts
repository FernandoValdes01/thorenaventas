import { api } from '../lib/api';
import type { BetterAuthSessionPayload } from '../types/auth';

export const authService = {
  login: (email: string, password: string) => api.post<BetterAuthSessionPayload>('/api/v1/auth/sign-in/email', { email, password }),
  signUp: (name: string, email: string, password: string) =>
    api.post<BetterAuthSessionPayload>('/api/v1/auth/sign-up/email', { name, email, password }),
  logout: () => api.post<{ success: boolean }>('/api/v1/auth/sign-out'),
  getSession: () => api.get<BetterAuthSessionPayload | null>('/api/v1/auth/get-session'),
};
