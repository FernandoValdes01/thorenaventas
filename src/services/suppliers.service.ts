import { api } from '../lib/api';

export const suppliersService = {
  list: () => api.get('/api/v1/suppliers'),
  create: (payload: unknown) => api.post('/api/v1/suppliers', payload),
  update: (id: string, payload: unknown) => api.patch(`/api/v1/suppliers/${id}`, payload),
};
