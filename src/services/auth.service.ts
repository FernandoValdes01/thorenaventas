import { api } from '../lib/api';
import type { AuthSession } from '../types/auth';

export const authService = {
  login: (email: string, password: string) => api.post<{ token: string }>('/api/v1/auth/login', { email, password }),
  logout: () => api.post<{ loggedOut: boolean }>('/api/v1/auth/logout'),
  getSession: () => api.get<AuthSession>('/api/v1/auth/session'),
};
