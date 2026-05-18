export interface Sale {
  id: string;
  orderCode: string;
  total: number;
}

export interface Cobranza {
  id: string;
  clientName: string;
  amount: number;
  balance: number;
  status: 'Pendiente' | 'Vencido' | 'Pagada';
}

export interface Route {
  id: string;
  zone: string;
  sector: string;
}

export interface Supplier {
  id: string;
  name: string;
}

export interface Purchase {
  id: string;
  supplier: string;
  totalCost: number;
}

export interface CityRate {
  id: string;
  city: string;
  rate: number;
}

export interface VolumeScale {
  id: string;
  label: string;
  minQuantity: number;
  maxQuantity: number;
  discountRate: number;
}

export interface PaymentMethod {
  id?: string;
  name: string;
}
