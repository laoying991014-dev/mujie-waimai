import { axiosForBackend } from '@client/src/api';
import type { CartInfo } from '@shared/api.interface';

export const getCart = async (): Promise<CartInfo> => {
  const { data } = await axiosForBackend.get('/api/cart');
  return data;
};

export const addToCart = async (
  productId: string,
  quantity: number,
): Promise<{ id: string; quantity: number }> => {
  const { data } = await axiosForBackend.post('/api/cart/items', { productId, quantity });
  return data;
};

export const updateCartItem = async (
  itemId: string,
  quantity: number,
): Promise<{ id: string; quantity: number }> => {
  const { data } = await axiosForBackend.patch(`/api/cart/items/${itemId}`, { quantity });
  return data;
};

export const removeCartItem = async (itemId: string): Promise<{ success: true }> => {
  const { data } = await axiosForBackend.delete(`/api/cart/items/${itemId}`);
  return data;
};

export const clearCart = async (): Promise<{ success: true }> => {
  const { data } = await axiosForBackend.delete('/api/cart');
  return data;
};
