import { api } from '../lib/api';

export const routesService = {
  list: () => api.get('/api/v1/routes'),
  create: (payload: unknown) => api.post('/api/v1/routes', payload),
  update: (id: string, payload: unknown) => api.patch(`/api/v1/routes/${id}`, payload),
};
