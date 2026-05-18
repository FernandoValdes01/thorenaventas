import { api } from '../lib/api';

export const cityRatesService = {
  list: () => api.get('/api/v1/city-rates'),
  create: (payload: unknown) => api.post('/api/v1/city-rates', payload),
  update: (id: string, payload: unknown) => api.patch(`/api/v1/city-rates/${id}`, payload),
  remove: (id: string) => api.delete(`/api/v1/city-rates/${id}`),
};
