export interface Product {
  id: string;
  sku?: string;
  name: string;
  category: string;
  stock: number;
  stockMin: number;
  basePrice: number;
}
