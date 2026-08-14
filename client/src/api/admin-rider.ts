import { axiosForBackend } from '@client/src/api';
import type { PaginatedResponse } from '@shared/api.interface';

export interface AdminRider {
  id: string;
  account: string;
  name: string;
  phone: string;
  avatarUrl: string;
  idCard: string;
  status: 'active' | 'disabled';
  onlineStatus: 'online' | 'offline' | 'busy';
  currentOrderCount: number;
  totalOrders: number;
  totalDeliveryFee: string;
  rating: string;
  auditStatus: 'pending' | 'approved' | 'rejected';
  auditReason: string;
  createdAt: string;
}

export interface RiderStats {
  totalRiders: number;
  activeRiders: number;
  onlineRiders: number;
  totalOrders: number;
  totalDeliveryFee: string;
}

export interface RiderOrderItem {
  id: string;
  orderNo: string;
  totalAmount: string;
  deliveryFee: string;
  status: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  createdAt: string;
}

interface ListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: 'all' | 'active' | 'disabled';
  auditStatus?: 'all' | 'pending' | 'approved' | 'rejected';
}

export const listRiders = async (
  params: ListParams,
): Promise<PaginatedResponse<AdminRider>> => {
  const { data } = await axiosForBackend.get('/api/admin/riders', { params });
  return data;
};

export const getRiderStats = async (): Promise<RiderStats> => {
  const { data } = await axiosForBackend.get('/api/admin/riders/stats');
  return data;
};

export const createRider = async (data: {
  account: string;
  password: string;
  name: string;
  phone: string;
  idCard?: string;
}): Promise<{ id: string }> => {
  const res = await axiosForBackend.post('/api/admin/riders', data);
  return res.data;
};

export const updateRider = async (
  id: string,
  data: {
    name?: string;
    phone?: string;
    idCard?: string;
  },
): Promise<{ success: true }> => {
  const res = await axiosForBackend.put(`/api/admin/riders/${id}`, data);
  return res.data;
};

export const updateRiderStatus = async (
  id: string,
  status: 'active' | 'disabled',
): Promise<{ success: true; status: string }> => {
  const res = await axiosForBackend.put(`/api/admin/riders/${id}/status`, {
    status,
  });
  return res.data;
};

export const auditRider = async (
  id: string,
  result: 'approved' | 'rejected',
  reason?: string,
): Promise<{ success: true; auditStatus: string }> => {
  const res = await axiosForBackend.put(`/api/admin/riders/${id}/audit`, {
    result,
    reason,
  });
  return res.data;
};

export const deleteRider = async (id: string): Promise<{ success: true }> => {
  const res = await axiosForBackend.delete(`/api/admin/riders/${id}`);
  return res.data;
};

export const updateRiderPassword = async (
  id: string,
  password: string,
): Promise<{ success: true }> => {
  const res = await axiosForBackend.put(`/api/admin/riders/${id}/password`, {
    password,
  });
  return res.data;
};

export const getRiderOrders = async (
  riderId: string,
  page: number = 1,
  pageSize: number = 10,
): Promise<PaginatedResponse<RiderOrderItem>> => {
  const { data } = await axiosForBackend.get(`/api/admin/riders/${riderId}/orders`, {
    params: { page, pageSize },
  });
  return data;
};
