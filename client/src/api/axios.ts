import { axiosForBackend } from './index';
import { useAuthStore } from '../store/auth';

axiosForBackend.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosForBackend.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const { logout, role } = useAuthStore.getState();
      logout();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout', { detail: { role } }));
      }
    }
    return Promise.reject(error);
  },
);
