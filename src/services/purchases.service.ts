import { api } from '../lib/api';

export const purchasesService = {
  create: (payload: unknown) => api.post('/api/v1/purchases', payload),
};
