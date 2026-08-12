import { axiosForBackend } from '@client/src/api';
import type { AddressItem } from '@shared/api.interface';

export const getAddresses = async (): Promise<{ items: AddressItem[] }> => {
  const { data } = await axiosForBackend.get('/api/addresses');
  return data;
};

export const createAddress = async (
  data: Omit<AddressItem, 'id'>,
): Promise<AddressItem> => {
  const res = await axiosForBackend.post('/api/addresses', data);
  return res.data;
};

export const updateAddress = async (
  id: string,
  data: Partial<Omit<AddressItem, 'id'>>,
): Promise<AddressItem> => {
  const res = await axiosForBackend.put(`/api/addresses/${id}`, data);
  return res.data;
};

export const deleteAddress = async (id: string): Promise<{ success: true }> => {
  const { data } = await axiosForBackend.delete(`/api/addresses/${id}`);
  return data;
};

export const setDefaultAddress = async (id: string): Promise<{ success: true }> => {
  const { data } = await axiosForBackend.post(`/api/addresses/${id}/default`);
  return data;
};
