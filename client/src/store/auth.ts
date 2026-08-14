import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AuthRole = 'user' | 'merchant' | 'admin' | 'rider';

interface AuthState {
  token: string | null;
  role: AuthRole | null;
  profile: Record<string, any> | null;
  setAuth: (token: string, role: AuthRole, profile: Record<string, any>) => void;
  setProfile: (profile: Record<string, any>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      profile: null,
      setAuth: (token, role, profile) => set({ token, role, profile }),
      setProfile: (profile) => set({ profile }),
      logout: () => set({ token: null, role: null, profile: null }),
    }),
    {
      name: 'mujie-auth-storage',
    },
  ),
);
