import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  theme: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUserTheme: (theme: string) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, user } = response.data;

      // Save token securely
      await SecureStore.setItemAsync('mydaily_jwt', accessToken);

      set({ user, isAuthenticated: true, isLoading: false });
      return true;
    } catch (e: any) {
      const message = e.response?.data?.message || 'Failed to authenticate';
      set({ error: typeof message === 'string' ? message : message[0], isLoading: false });
      return false;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { accessToken, user } = response.data;

      // Save token securely
      await SecureStore.setItemAsync('mydaily_jwt', accessToken);

      set({ user, isAuthenticated: true, isLoading: false });
      return true;
    } catch (e: any) {
      const message = e.response?.data?.message || 'Failed to register';
      set({ error: typeof message === 'string' ? message : message[0], isLoading: false });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await SecureStore.deleteItemAsync('mydaily_jwt');
      set({ user: null, isAuthenticated: false, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync('mydaily_jwt');
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const response = await api.get('/users/me');
      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch (e) {
      // Token invalid or expired, log out
      await SecureStore.deleteItemAsync('mydaily_jwt');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUserTheme: (theme) => {
    const user = get().user;
    if (user) {
      set({ user: { ...user, theme } });
    }
  },
}));
