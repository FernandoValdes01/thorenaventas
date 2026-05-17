import { api } from '../lib/api';
import type { Quote } from '../types/quote';

export const quotesService = {
  list: () => api.get<Quote[]>('/api/v1/quotes'),
  create: (payload: Partial<Quote>) => api.post<Quote>('/api/v1/quotes', payload),
};
