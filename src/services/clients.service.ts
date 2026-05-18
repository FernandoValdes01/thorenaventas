import { api } from '../lib/api';
import type { Client } from '../types/client';

export const clientsService = {
  list: () => api.get<Client[]>('/api/v1/clients'),
  getById: (id: string) => api.get<Client>(`/api/v1/clients/${id}`),
  create: (payload: unknown) => api.post<Client>('/api/v1/clients', payload),
  update: (id: string, payload: unknown) => api.patch<Client>(`/api/v1/clients/${id}`, payload),
};
