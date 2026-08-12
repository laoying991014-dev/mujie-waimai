import { axiosForBackend } from '@client/src/api';
import type {
  MerchantBrief,
  MerchantCategory,
  PaginatedResponse,
  ProductItem,
  ShopDetail,
} from '@shared/api.interface';

export const getMerchantList = async (params: {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  keyword?: string;
  sortBy?: 'default' | 'sales' | 'rating' | 'deliveryFee';
}): Promise<PaginatedResponse<MerchantBrief>> => {
  const { data } = await axiosForBackend.get('/api/merchants', { params });
  return data;
};

export const getShopDetail = async (id: string): Promise<ShopDetail> => {
  const { data } = await axiosForBackend.get(`/api/shops/${id}`);
  return data;
};

export const getShopProducts = async (
  id: string,
): Promise<{ categories: MerchantCategory[]; products: ProductItem[] }> => {
  const { data } = await axiosForBackend.get(`/api/shops/${id}/products`);
  return data;
};
