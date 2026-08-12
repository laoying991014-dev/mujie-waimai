import { axiosForBackend } from '@client/src/api';
import type {
  NoticeItemFull,
  BannerFull,
  SiteSettings,
  PaginatedResponse,
} from '@shared/api.interface';

// 公告
export const listNotices = async (params: {
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<NoticeItemFull>> => {
  const { data } = await axiosForBackend.get('/api/admin/notices', { params });
  return data;
};

export const createNotice = async (data: {
  title: string;
  content: string;
  status: 'published' | 'draft';
}): Promise<{ id: string }> => {
  const res = await axiosForBackend.post('/api/admin/notices', data);
  return res.data;
};

export const updateNotice = async (
  id: string,
  data: { title: string; content: string; status: 'published' | 'draft' }
): Promise<{ success: true }> => {
  const res = await axiosForBackend.put(`/api/admin/notices/${id}`, data);
  return res.data;
};

export const deleteNotice = async (id: string): Promise<{ success: true }> => {
  const res = await axiosForBackend.delete(`/api/admin/notices/${id}`);
  return res.data;
};

export const getNoticeDetail = async (
  id: string
): Promise<NoticeItemFull & { content: string }> => {
  const { data } = await axiosForBackend.get(`/api/admin/notices/${id}`);
  return data;
};

// 网站设置
export const getSiteSettings = async (): Promise<SiteSettings> => {
  const { data } = await axiosForBackend.get('/api/admin/site-settings');
  return data;
};

export const saveSiteSettings = async (
  data: SiteSettings
): Promise<{ success: true }> => {
  const res = await axiosForBackend.put('/api/admin/site-settings', data);
  return res.data;
};

// 活动轮播
export const listBanners = async (): Promise<{ items: BannerFull[] }> => {
  const { data } = await axiosForBackend.get('/api/admin/banners');
  return data;
};

export const createBanner = async (data: {
  title: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: number;
}): Promise<{ id: string }> => {
  const res = await axiosForBackend.post('/api/admin/banners', data);
  return res.data;
};

export const updateBanner = async (
  id: string,
  data: {
    title: string;
    imageUrl: string;
    linkUrl: string;
    sortOrder: number;
    status: 'active' | 'inactive';
  }
): Promise<{ success: true }> => {
  const res = await axiosForBackend.put(`/api/admin/banners/${id}`, data);
  return res.data;
};

export const deleteBanner = async (id: string): Promise<{ success: true }> => {
  const res = await axiosForBackend.delete(`/api/admin/banners/${id}`);
  return res.data;
};
