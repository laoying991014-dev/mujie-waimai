import { axiosForBackend } from './index';
import type { DashboardStats, MerchantOrderItem } from '@shared/api.interface';

export async function getStats(): Promise<DashboardStats> {
  const { data } = await axiosForBackend.get<DashboardStats>(
    '/api/merchant/dashboard/stats',
  );
  return data;
}

export async function getPendingOrders(
  limit = 5,
): Promise<{ items: MerchantOrderItem[] }> {
  const { data } = await axiosForBackend.get<{ items: MerchantOrderItem[] }>(
    '/api/merchant/dashboard/pending-orders',
    { params: { limit } },
  );
  return data;
}
