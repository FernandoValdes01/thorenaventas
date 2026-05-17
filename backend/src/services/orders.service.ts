import { detailStub, listStub } from './base.service';

export const ordersService = {
  list: () => listStub('orders'),
  getById: (id: string) => detailStub('orders', id),
};
