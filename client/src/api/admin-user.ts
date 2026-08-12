import { axiosForBackend, logger } from './index';
import type { AdminUser, PaginatedResponse } from '@shared/api.interface';

export interface UserListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: 'all' | 'active' | 'disabled';
}

export interface CreateUserParams {
  phone: string;
  password: string;
  nickname: string;
  avatarUrl?: string;
}

export interface UpdateUserParams {
  nickname?: string;
  phone?: string;
  avatarUrl?: string;
}

export async function listUsers(
  params: UserListParams = {},
): Promise<PaginatedResponse<AdminUser>> {
  try {
    const res = await axiosForBackend.get<PaginatedResponse<AdminUser>>(
      '/api/admin/users',
      { params },
    );
    return res.data;
  } catch (error) {
    logger.error('获取用户列表失败', error);
    throw error;
  }
}

export async function createUser(params: CreateUserParams): Promise<{ id: string }> {
  try {
    const res = await axiosForBackend.post<{ id: string }>('/api/admin/users', params);
    return res.data;
  } catch (error) {
    logger.error('创建用户失败', error);
    throw error;
  }
}

export async function updateUser(
  id: string,
  params: UpdateUserParams,
): Promise<{ success: true }> {
  try {
    const res = await axiosForBackend.put<{ success: true }>(
      `/api/admin/users/${id}`,
      params,
    );
    return res.data;
  } catch (error) {
    logger.error('更新用户失败', error);
    throw error;
  }
}

export async function updateUserStatus(
  id: string,
  status: 'active' | 'disabled',
): Promise<{ success: true; status: string }> {
  try {
    const res = await axiosForBackend.patch<{ success: true; status: string }>(
      `/api/admin/users/${id}/status`,
      { status },
    );
    return res.data;
  } catch (error) {
    logger.error('更新用户状态失败', error);
    throw error;
  }
}

export async function deleteUser(id: string): Promise<{ success: true }> {
  try {
    const res = await axiosForBackend.delete<{ success: true }>(`/api/admin/users/${id}`);
    return res.data;
  } catch (error) {
    logger.error('删除用户失败', error);
    throw error;
  }
}
