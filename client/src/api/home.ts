import { axiosForBackend } from '@client/src/api';
import type {
  BannerItem,
  CategoryItem,
  HotProductItem,
  MerchantBrief,
  NoticeItem,
} from '@shared/api.interface';

export const getCategories = async (): Promise<{ items: CategoryItem[] }> => {
  const { data } = await axiosForBackend.get('/api/home/categories');
  return data;
};

export const getBanners = async (): Promise<{ items: BannerItem[] }> => {
  const { data } = await axiosForBackend.get('/api/home/banners');
  return data;
};

export const getNotices = async (): Promise<{ items: NoticeItem[] }> => {
  const { data } = await axiosForBackend.get('/api/home/notices');
  return data;
};

export const getRecommendedMerchants = async (): Promise<{ items: MerchantBrief[] }> => {
  const { data } = await axiosForBackend.get('/api/home/recommended-merchants');
  return data;
};

export const getNearbyMerchants = async (limit = 10): Promise<{ items: MerchantBrief[] }> => {
  const { data } = await axiosForBackend.get('/api/home/nearby-merchants', { params: { limit } });
  return data;
};

export const getHotProducts = async (limit = 10): Promise<{ items: HotProductItem[] }> => {
  const { data } = await axiosForBackend.get('/api/home/hot-products', { params: { limit } });
  return data;
};

export const search = async (
  keyword: string,
): Promise<{ merchants: MerchantBrief[]; products: HotProductItem[] }> => {
  const { data } = await axiosForBackend.get('/api/home/search', { params: { keyword } });
  return data;
};
