export interface QuoteItem {
  productId: string;
  quantity: number;
}

export interface Quote {
  id?: string;
  code?: string;
  clientId: string;
  paymentMethod: string;
  observations: string;
  items: QuoteItem[];
}
