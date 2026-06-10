import api from '../axios';

export interface RetailProductPayload {
  name: string;
  description?: string;
  price: number;
  stockQty?: number;
  isActive?: boolean;
}

export const listRetailProducts = () => api.get('/retail-products');

export const createRetailProduct = (data: RetailProductPayload) => api.post('/retail-products', data);

export const updateRetailProduct = (id: string, data: Partial<RetailProductPayload>) =>
  api.put(`/retail-products/${id}`, data);

export const deleteRetailProduct = (id: string) => api.delete(`/retail-products/${id}`);
