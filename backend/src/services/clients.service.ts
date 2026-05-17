import { detailStub, listStub } from './base.service';

export const clientsService = {
  list: () => listStub('clients'),
  getById: (id: string) => detailStub('clients', id),
};
