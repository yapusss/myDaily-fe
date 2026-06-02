import { create } from 'zustand';
import api from '../services/api';
import { useAuthStore } from './authStore';

interface SettingsState {
  isDark: boolean;
  language: 'en' | 'id';
  setTheme: (isDark: boolean) => Promise<void>;
  toggleTheme: () => Promise<void>;
  loadLocalPreferences: () => void;
  setLanguage: (lang: 'en' | 'id') => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  isDark: false,
  language: 'en',

  loadLocalPreferences: () => {
    // Read theme preference from active auth user details
    const user = useAuthStore.getState().user;
    if (user) {
      set({ isDark: user.theme === 'dark' });
    }
  },

  setTheme: async (isDark: boolean) => {
    const themeStr = isDark ? 'dark' : 'light';
    set({ isDark });

    const { user, updateUserTheme } = useAuthStore.getState();
    if (user) {
      try {
        updateUserTheme(themeStr);
        await api.patch('/users/settings', { theme: themeStr });
      } catch (e) {
        console.warn('Failed to sync theme preference to backend:', e);
      }
    }
  },

  toggleTheme: async () => {
    const nextDark = !get().isDark;
    await get().setTheme(nextDark);
  },

  setLanguage: (language: 'en' | 'id') => {
    set({ language });
  },
}));
