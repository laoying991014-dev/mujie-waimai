import { axiosForBackend } from './index';
import type {
  MerchantOrderItem,
  MerchantOrderDetail,
  PaginatedResponse,
  OrderStatus,
} from '@shared/api.interface';

export async function getOrderList(params: {
  page: number;
  pageSize: number;
  status?: string;
}): Promise<PaginatedResponse<MerchantOrderItem>> {
  const { data } = await axiosForBackend.get<
    PaginatedResponse<MerchantOrderItem>
  >('/api/merchant/orders', { params });
  return data;
}

export async function getOrderDetail(id: string): Promise<MerchantOrderDetail> {
  const { data } = await axiosForBackend.get<MerchantOrderDetail>(
    `/api/merchant/orders/${id}`,
  );
  return data;
}

export async function acceptOrder(
  id: string,
): Promise<{ success: boolean; status: string }> {
  const { data } = await axiosForBackend.post<{
    success: boolean;
    status: string;
  }>(`/api/merchant/orders/${id}/accept`);
  return data;
}

export async function rejectOrder(
  id: string,
  reason: string,
): Promise<{ success: boolean; status: string }> {
  const { data } = await axiosForBackend.post<{
    success: boolean;
    status: string;
  }>(`/api/merchant/orders/${id}/reject`, { reason });
  return data;
}

export async function progressOrder(
  id: string,
  targetStatus: OrderStatus,
): Promise<{ success: boolean; status: string }> {
  const { data } = await axiosForBackend.post<{
    success: boolean;
    status: string;
  }>(`/api/merchant/orders/${id}/progress`, { targetStatus });
  return data;
}
