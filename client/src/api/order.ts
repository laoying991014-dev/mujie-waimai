import { axiosForBackend } from '@client/src/api';
import type {
  OrderDetail,
  OrderSummary,
  PaginatedResponse,
} from '@shared/api.interface';

export const createOrder = async (
  addressId: string,
  remark?: string,
): Promise<{ orderId: string; orderNo: string; status: string }> => {
  const { data } = await axiosForBackend.post('/api/orders', { addressId, remark });
  return data;
};

export const getOrders = async (
  params: { page?: number; pageSize?: number; status?: string } = {},
): Promise<PaginatedResponse<OrderSummary>> => {
  const { data } = await axiosForBackend.get('/api/orders', { params });
  return data;
};

export const getOrderDetail = async (id: string): Promise<OrderDetail> => {
  const { data } = await axiosForBackend.get(`/api/orders/${id}`);
  return data;
};

export const cancelOrder = async (
  id: string,
  reason: string,
): Promise<{ success: true; status: string }> => {
  const { data } = await axiosForBackend.post(`/api/orders/${id}/cancel`, { reason });
  return data;
};
