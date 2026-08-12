import { axiosForBackend, logger } from './index';

export interface UserLoginResponse {
  token: string;
  user: {
    id: string;
    phone: string;
    nickname: string;
    avatarUrl: string;
  };
}

export interface MerchantLoginResponse {
  token: string;
  merchant: {
    id: string;
    account: string;
    shopName: string;
    shopLogoUrl: string;
  };
}

export interface AdminLoginResponse {
  token: string;
  admin: {
    id: string;
    username: string;
    realName: string;
    role: string;
  };
}

export async function registerUser(phone: string, password: string, nickname?: string) {
  try {
    const res = await axiosForBackend.post<UserLoginResponse>('/api/auth/user/register', {
      phone,
      password,
      nickname,
    });
    return res.data;
  } catch (error) {
    logger.error('用户注册失败', error);
    throw error;
  }
}

export async function loginUser(phone: string, password: string) {
  try {
    const res = await axiosForBackend.post<UserLoginResponse>('/api/auth/user/login', {
      phone,
      password,
    });
    return res.data;
  } catch (error) {
    logger.error('用户登录失败', error);
    throw error;
  }
}

export async function loginMerchant(account: string, password: string) {
  try {
    const res = await axiosForBackend.post<MerchantLoginResponse>(
      '/api/auth/merchant/login',
      { account, password },
    );
    return res.data;
  } catch (error) {
    logger.error('商家登录失败', error);
    throw error;
  }
}

export async function loginAdmin(username: string, password: string) {
  try {
    const res = await axiosForBackend.post<AdminLoginResponse>(
      '/api/auth/admin/login',
      { username, password },
    );
    return res.data;
  } catch (error) {
    logger.error('管理员登录失败', error);
    throw error;
  }
}
