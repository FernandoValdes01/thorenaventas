import logoUrl from '../../storeinfo/logothorena.jpg';

export const APP_NAME = 'Thorena Comercial';
export const APP_SUBTITLE = 'MVP interno de ventas';
export const APP_LOCATION = 'Villarrica, Región de La Araucanía';
export const LOGIN_CREDENTIALS = {
  username: 'usuario1',
  password: 'boceto',
};

export const PRODUCTS = [
  { id: 'item-1', name: 'Item 1', price: 1990 },
  { id: 'item-2', name: 'Item 2', price: 3490 },
  { id: 'item-3', name: 'Item 3', price: 5990 },
  { id: 'item-4', name: 'Item 4', price: 9990 },
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
