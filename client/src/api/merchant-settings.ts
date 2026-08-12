import { axiosForBackend } from './index';
import type { ShopSettings } from '@shared/api.interface';

export async function getSettings(): Promise<ShopSettings> {
  const { data } = await axiosForBackend.get<ShopSettings>(
    '/api/merchant/shop/settings',
  );
  return data;
}

export async function saveSettings(
  payload: Omit<ShopSettings, 'businessStatus'>,
): Promise<{ success: boolean }> {
  const { data } = await axiosForBackend.put<{ success: boolean }>(
    '/api/merchant/shop/settings',
    payload,
  );
  return data;
}

export async function updateBusinessStatus(
  status: 'open' | 'closed',
): Promise<{ success: boolean; status: string }> {
  const { data } = await axiosForBackend.patch<{
    success: boolean;
    status: string;
  }>('/api/merchant/shop/business-status', { status });
  return data;
}
