import { axiosForBackend } from './index';
import type {
  MerchantCategory,
  MerchantProduct,
  PaginatedResponse,
} from '@shared/api.interface';

interface ProductListParams {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  keyword?: string;
  status?: 'all' | 'on_sale' | 'off_sale';
}

export async function getCategories(): Promise<{ items: MerchantCategory[] }> {
  const { data } = await axiosForBackend.get<{ items: MerchantCategory[] }>(
    '/api/merchant/categories',
  );
  return data;
}

export async function createCategory(payload: {
  name: string;
  sortOrder: number;
}): Promise<{ id: string }> {
  const { data } = await axiosForBackend.post<{ id: string }>(
    '/api/merchant/categories',
    payload,
  );
  return data;
}

export async function updateCategory(
  id: string,
  payload: { name: string; sortOrder: number },
): Promise<{ success: true }> {
  const { data } = await axiosForBackend.put<{ success: true }>(
    `/api/merchant/categories/${id}`,
    payload,
  );
  return data;
}

export async function deleteCategory(
  id: string,
): Promise<{ success: true }> {
  const { data } = await axiosForBackend.delete<{ success: true }>(
    `/api/merchant/categories/${id}`,
  );
  return data;
}

export async function getProducts(
  params: ProductListParams = {},
): Promise<PaginatedResponse<MerchantProduct>> {
  const { data } = await axiosForBackend.get<
    PaginatedResponse<MerchantProduct>
  >('/api/merchant/products', { params });
  return data;
}

export async function createProduct(payload: {
  name: string;
  description: string;
  price: string;
  stock: number;
  categoryId?: string;
  mainImageUrl: string;
  status: 'on_sale' | 'off_sale';
}): Promise<{ id: string }> {
  const { data } = await axiosForBackend.post<{ id: string }>(
    '/api/merchant/products',
    payload,
  );
  return data;
}

export async function updateProduct(
  id: string,
  payload: {
    name: string;
    description: string;
    price: string;
    stock: number;
    categoryId?: string;
    mainImageUrl: string;
    status: 'on_sale' | 'off_sale';
  },
): Promise<{ success: true }> {
  const { data } = await axiosForBackend.put<{ success: true }>(
    `/api/merchant/products/${id}`,
    payload,
  );
  return data;
}

export async function deleteProduct(
  id: string,
): Promise<{ success: true }> {
  const { data } = await axiosForBackend.delete<{ success: true }>(
    `/api/merchant/products/${id}`,
  );
  return data;
}

export async function updateProductStatus(
  id: string,
  status: 'on_sale' | 'off_sale',
): Promise<{ success: true; status: 'on_sale' | 'off_sale' }> {
  const { data } = await axiosForBackend.patch<{
    success: true;
    status: 'on_sale' | 'off_sale';
  }>(`/api/merchant/products/${id}/status`, { status });
  return data;
}
