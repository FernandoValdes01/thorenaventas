import { api } from '../lib/api';

export const cobranzasService = {
  list: () => api.get('/api/v1/cobranzas'),
  create: (payload: unknown) => api.post('/api/v1/cobranzas', payload),
  update: (id: string, payload: unknown) => api.patch(`/api/v1/cobranzas/${id}`, payload),
  remove: (id: string) => api.delete(`/api/v1/cobranzas/${id}`),
};
