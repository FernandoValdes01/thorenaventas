import { api } from '../lib/api';
import type { Client } from '../types/client';

export const clientsService = {
  list: () => api.get<Client[]>('/api/v1/clients'),
  getById: (id: string) => api.get<Client>(`/api/v1/clients/${id}`),
};
