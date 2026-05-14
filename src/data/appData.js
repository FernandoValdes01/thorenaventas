import logoUrl from '../../storeinfo/logothorena.jpg';

export const APP_NAME = 'Thorena Comercial';
export const APP_SUBTITLE = 'MVP interno de ventas';
export const APP_LOCATION = 'Villarrica, Región de La Araucanía';
export const LOGIN_CREDENTIALS = {
  username: 'usuario1',
  password: 'boceto',
};

export const PRODUCTS = [
  {
    id: 'item-1',
    name: 'Item 1',
    category: 'General',
    stock: 50,
    basePrice: 1990,
    offer: { mode: 'none', discountPercent: 0, endDate: '' },
  },
  {
    id: 'item-2',
    name: 'Item 2',
    category: 'General',
    stock: 40,
    basePrice: 3490,
    offer: { mode: 'none', discountPercent: 0, endDate: '' },
  },
  {
    id: 'item-3',
    name: 'Item 3',
    category: 'General',
    stock: 30,
    basePrice: 5990,
    offer: { mode: 'none', discountPercent: 0, endDate: '' },
  },
  {
    id: 'item-4',
    name: 'Item 4',
    category: 'General',
    stock: 20,
    basePrice: 9990,
    offer: { mode: 'none', discountPercent: 0, endDate: '' },
  },
];

export const CHECKLIST_ITEMS = [
  { key: 'customerConfirmed', label: 'Datos del cliente confirmados' },
  { key: 'productsReviewed', label: 'Productos revisados' },
  { key: 'addressConfirmed', label: 'Dirección de despacho confirmada' },
  { key: 'readyForDispatch', label: 'Pedido listo para despacho' },
];

export const DEFAULT_SELLER = {
  name: 'usuario1',
  rut: '-',
};

export const logo = logoUrl;
