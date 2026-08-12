import { axiosForBackend, logger } from './index';
import type {
  AdminProduct,
  ProductCategory,
  PaginatedResponse,
} from '@shared/api.interface';

// 平台分类
export async function listCategories(): Promise<{ items: ProductCategory[] }> {
  try {
    const res =
      await axiosForBackend.get<{ items: ProductCategory[] }>(
        '/api/admin/categories',
      );
    return res.data;
  } catch (error) {
    logger.error('获取平台分类列表失败', error);
    throw error;
  }
}

export async function createCategory(data: {
  name: string;
  iconUrl: string;
  sortOrder: number;
}): Promise<{ id: string }> {
  try {
    const res = await axiosForBackend.post<{ id: string }>(
      '/api/admin/categories',
      data,
    );
    return res.data;
  } catch (error) {
    logger.error('创建平台分类失败', error);
    throw error;
  }
}

export async function updateCategory(
  id: string,
  data: {
    name: string;
    iconUrl: string;
    sortOrder: number;
    status: 'active' | 'inactive';
  },
): Promise<{ success: true }> {
  try {
    const res = await axiosForBackend.put<{ success: true }>(
      `/api/admin/categories/${id}`,
      data,
    );
    return res.data;
  } catch (error) {
    logger.error('更新平台分类失败', error);
    throw error;
  }
}

export async function deleteCategory(
  id: string,
): Promise<{ success: true }> {
  try {
    const res = await axiosForBackend.delete<{ success: true }>(
      `/api/admin/categories/${id}`,
    );
    return res.data;
  } catch (error) {
    logger.error('删除平台分类失败', error);
    throw error;
  }
}

// 商品
export interface ProductListParams {
  page?: number;
  pageSize?: number;
  merchantId?: string;
  categoryId?: string;
  status?: 'all' | 'on_sale' | 'off_sale';
  keyword?: string;
}

export async function listProducts(
  params: ProductListParams = {},
): Promise<PaginatedResponse<AdminProduct>> {
  try {
    const res = await axiosForBackend.get<PaginatedResponse<AdminProduct>>(
      '/api/admin/products',
      { params },
    );
    return res.data;
  } catch (error) {
    logger.error('获取商品列表失败', error);
    throw error;
  }
}

export async function forceOffProduct(
  id: string,
): Promise<{ success: true; status: string }> {
  try {
    const res = await axiosForBackend.patch<{
      success: true;
      status: string;
    }>(`/api/admin/products/${id}/force-off`);
    return res.data;
  } catch (error) {
    logger.error('强制下架商品失败', error);
    throw error;
  }
}

export async function getProductDetail(
  id: string,
): Promise<AdminProduct & { description: string; stock: number }> {
  try {
    const res = await axiosForBackend.get<
      AdminProduct & { description: string; stock: number }
    >(`/api/admin/products/${id}`);
    return res.data;
  } catch (error) {
    logger.error('获取商品详情失败', error);
    throw error;
  }
}
