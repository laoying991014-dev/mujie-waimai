import { axiosForBackend } from '@client/src/api';
import type {
  AdminOrder,
  AdminOrderDetail,
  PaginatedResponse,
} from '@shared/api.interface';

interface OrderListParams {
  page?: number;
  pageSize?: number;
  orderNo?: string;
  merchantId?: string;
  userId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export const listOrders = async (
  params: OrderListParams
): Promise<PaginatedResponse<AdminOrder>> => {
  const { data } = await axiosForBackend.get('/api/admin/orders', { params });
  return data;
};

export const getOrderDetail = async (
  id: string
): Promise<AdminOrderDetail> => {
  const { data } = await axiosForBackend.get(`/api/admin/orders/${id}`);
  return data;
};

export const updateOrderStatus = async (
  id: string,
  status: string
): Promise<{ success: true; status: string }> => {
  const res = await axiosForBackend.patch(
    `/api/admin/orders/${id}/status`,
    { status }
  );
  return res.data;
};
