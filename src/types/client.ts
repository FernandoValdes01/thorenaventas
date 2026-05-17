export type ClientStatus = 'Activo' | 'Inactivo';

export interface Client {
  id: string;
  name: string;
  type: string;
  rut: string;
  phone: string;
  contact: string;
  email: string;
  address: string;
  zone: string;
  sector: string;
  status: ClientStatus;
}
