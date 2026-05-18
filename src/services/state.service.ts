import { api } from '../lib/api';

export type StateKey =
  | 'clients'
  | 'products'
  | 'orders'
  | 'cobranzas'
  | 'erpRoutes'
  | 'erpScales'
  | 'erpPurchases'
  | 'erpSales'
  | 'erpProductsFull'
  | 'erpSuppliers'
  | 'erpCityRates';

export const stateService = {
  get: <T>(key: StateKey) => api.get<{ key: StateKey; data: T | null }>(`/api/v1/state/${key}`),
  set: <T>(key: StateKey, data: T) => api.post<{ key: StateKey; data: T }>(`/api/v1/state/${key}`, { data }),
};
