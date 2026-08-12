import { axiosForBackend } from '@client/src/api';
import type { AdminMerchant, PaginatedResponse } from '@shared/api.interface';

interface ListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  auditStatus?: 'all' | 'pending' | 'approved' | 'rejected';
}

export const listMerchants = async (
  params: ListParams,
): Promise<PaginatedResponse<AdminMerchant>> => {
  const { data } = await axiosForBackend.get('/api/admin/merchants', { params });
  return data;
};

export const createMerchant = async (data: {
  account: string;
  password: string;
  shopName: string;
  contactName: string;
  contactPhone: string;
  address: string;
  categoryId: string;
  deliveryFee: string;
  minOrderAmount: string;
}): Promise<{ id: string }> => {
  const res = await axiosForBackend.post('/api/admin/merchants', data);
  return res.data;
};

export const updateMerchant = async (
  id: string,
  data: {
    shopName?: string;
    contactName?: string;
    contactPhone?: string;
    address?: string;
    categoryId?: string;
    deliveryFee?: string;
    minOrderAmount?: string;
  },
): Promise<{ success: true }> => {
  const res = await axiosForBackend.put(`/api/admin/merchants/${id}`, data);
  return res.data;
};

export const auditMerchant = async (
  id: string,
  result: 'approved' | 'rejected',
  reason?: string,
): Promise<{ success: true; auditStatus: string }> => {
  const res = await axiosForBackend.post(`/api/admin/merchants/${id}/audit`, {
    result,
    reason,
  });
  return res.data;
};

export const toggleMerchantStatus = async (
  id: string,
  status: 'active' | 'disabled',
): Promise<{ success: true; status: string }> => {
  const res = await axiosForBackend.patch(`/api/admin/merchants/${id}/status`, {
    status,
  });
  return res.data;
};

export const deleteMerchant = async (id: string): Promise<{ success: true }> => {
  const res = await axiosForBackend.delete(`/api/admin/merchants/${id}`);
  return res.data;
};
