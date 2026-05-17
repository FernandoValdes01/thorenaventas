import { api } from '../lib/api';
import type { Order } from '../types/order';

export const ordersService = {
  list: () => api.get<Order[]>('/api/v1/orders'),
  create: (payload: Partial<Order>) => api.post<Order>('/api/v1/orders', payload),
};
