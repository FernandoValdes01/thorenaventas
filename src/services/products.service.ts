import { api } from '../lib/api';
import type { Product } from '../types/product';

export const productsService = {
  list: () => api.get<Product[]>('/api/v1/products'),
  getById: (id: string) => api.get<Product>(`/api/v1/products/${id}`),
  createWithInitialPurchase: (payload: unknown) => api.post('/api/v1/products', payload),
  update: (id: string, payload: unknown) => api.patch<Product>(`/api/v1/products/${id}`, payload),
};
