import { axiosForBackend, logger } from './index';
import type { AdminOverview, AdminTrends } from '@shared/api.interface';

export async function getOverview(): Promise<AdminOverview> {
  try {
    const res = await axiosForBackend.get<AdminOverview>('/api/admin/dashboard/overview');
    return res.data;
  } catch (error) {
    logger.error('获取管理员概览数据失败', error);
    throw error;
  }
}

export async function getTrends(period: 'today' | 'week' | 'month' = 'week'): Promise<AdminTrends> {
  try {
    const res = await axiosForBackend.get<AdminTrends>('/api/admin/dashboard/trends', {
      params: { period },
    });
    return res.data;
  } catch (error) {
    logger.error('获取趋势数据失败', error);
    throw error;
  }
}
