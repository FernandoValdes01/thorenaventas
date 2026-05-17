import { detailStub, listStub } from './base.service';

export const quotesService = {
  list: () => listStub('quotes'),
  getById: (id: string) => detailStub('quotes', id),
};
