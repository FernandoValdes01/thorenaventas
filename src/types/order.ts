export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  code: string;
  saleChannel: 'terreno' | 'online' | 'oficina';
  status: string;
  clientId: string;
  paymentMethod: string;
  itemsTotal: number;
  dispatchRate: number;
  dispatchSurcharge: number;
  total: number;
  items: OrderItem[];
}
