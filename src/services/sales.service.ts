import { api } from '../lib/api';

export const salesService = {
  list: () => api.get('/api/v1/sales'),
  create: (payload: unknown) => api.post('/api/v1/sales', payload),
  update: (id: string, payload: unknown) => api.patch(`/api/v1/sales/${id}`, payload),
  remove: (id: string) => api.delete(`/api/v1/sales/${id}`),
};
