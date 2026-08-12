import { axiosForBackend } from '@client/src/api';
import type { UserProfile } from '@shared/api.interface';

export const getProfile = async (): Promise<UserProfile> => {
  const { data } = await axiosForBackend.get('/api/user/profile');
  return data;
};

export const updateProfile = async (
  data: { nickname?: string; avatarUrl?: string },
): Promise<UserProfile> => {
  const res = await axiosForBackend.put('/api/user/profile', data);
  return res.data;
};
