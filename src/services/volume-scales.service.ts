import { api } from '../lib/api';

export const volumeScalesService = {
  list: () => api.get('/api/v1/volume-scales'),
  create: (payload: unknown) => api.post('/api/v1/volume-scales', payload),
  update: (id: string, payload: unknown) => api.patch(`/api/v1/volume-scales/${id}`, payload),
  remove: (id: string) => api.delete(`/api/v1/volume-scales/${id}`),
};
