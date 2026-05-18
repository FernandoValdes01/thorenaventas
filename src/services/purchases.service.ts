import { api } from '../lib/api';

export const purchasesService = {
  list: () => api.get('/api/v1/purchases'),
  create: (payload: unknown) => api.post('/api/v1/purchases', payload),
  update: (id: string, payload: unknown) => api.patch(`/api/v1/purchases/${id}`, payload),
};
