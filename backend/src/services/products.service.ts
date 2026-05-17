import { detailStub, listStub } from './base.service';

export const productsService = {
  list: () => listStub('products'),
  getById: (id: string) => detailStub('products', id),
};
