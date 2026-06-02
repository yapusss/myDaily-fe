import { create } from 'zustand';
import api from '../services/api';

export interface Category {
  id: string;
  name: string;
  isDefault: boolean;
  userId: string | null;
}

export interface Activity {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  categoryId: string;
  category: Category;
  createdAt: string;
}

export interface SummaryCategory {
  categoryId: string;
  name: string;
  totalMinutes: number;
  percentage: number;
}

export interface Summary {
  totalDurationMinutes: number;
  categories: SummaryCategory[];
}

interface ActivityState {
  activities: Activity[];
  categories: Category[];
  summary: Summary | null;
  isLoading: boolean;
  error: string | null;

  fetchActivities: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  createActivity: (activity: {
    title: string;
    startTime: string;
    endTime: string;
    categoryId: string;
  }) => Promise<boolean>;
  updateActivity: (
    id: string,
    activity: {
      title?: string;
      startTime?: string;
      endTime?: string;
      categoryId?: string;
    },
  ) => Promise<boolean>;
  deleteActivity: (id: string) => Promise<boolean>;
  createCategory: (name: string) => Promise<boolean>;
  clearError: () => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  categories: [],
  summary: null,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchActivities: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/activities');
      set({ activities: response.data, isLoading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.message || 'Failed to load activities', isLoading: false });
    }
  },

  fetchCategories: async () => {
    try {
      const response = await api.get('/categories');
      set({ categories: response.data });
    } catch (e) {
      console.warn('Failed to load categories:', e);
    }
  },

  fetchSummary: async () => {
    try {
      const offset = new Date().getTimezoneOffset();
      const response = await api.get(`/activities/summary?timezoneOffset=${offset}`);
      set({ summary: response.data });
    } catch (e) {
      console.warn('Failed to load summary stats:', e);
    }
  },

  createActivity: async (dto) => {
    set({ error: null });

    // Temp category details for optimistic UI
    const cat = get().categories.find((c) => c.id === dto.categoryId) || {
      id: dto.categoryId,
      name: 'Activity',
      isDefault: false,
      userId: '',
    };

    const optimisticId = 'opt_' + Math.random().toString(36).substr(2, 9);
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    const duration = Math.round((end.getTime() - start.getTime()) / 60000);

    const optimisticActivity: Activity = {
      id: optimisticId,
      title: dto.title,
      startTime: dto.startTime,
      endTime: dto.endTime,
      duration,
      categoryId: dto.categoryId,
      category: cat,
      createdAt: new Date().toISOString(),
    };

    const previousActivities = get().activities;

    // Apply Optimistic Update
    set({
      activities: [...previousActivities, optimisticActivity].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      ),
    });

    try {
      const response = await api.post('/activities', dto);

      // Replace optimistic activity with actual API response
      set({
        activities: get().activities.map((a) => (a.id === optimisticId ? response.data : a)),
      });

      // Refresh weekly summaries
      get().fetchSummary();
      return true;
    } catch (e: any) {
      // Revert in case of failure
      set({ activities: previousActivities });
      const msg = e.response?.data?.message || 'Failed to save activity';
      set({ error: typeof msg === 'string' ? msg : msg[0] });
      return false;
    }
  },

  updateActivity: async (id, dto) => {
    set({ error: null });
    const previousActivities = get().activities;
    const original = previousActivities.find((a) => a.id === id);
    if (!original) return false;

    const start = dto.startTime ? new Date(dto.startTime) : new Date(original.startTime);
    const end = dto.endTime ? new Date(dto.endTime) : new Date(original.endTime);
    const duration = Math.round((end.getTime() - start.getTime()) / 60000);
    const cat = dto.categoryId
      ? get().categories.find((c) => c.id === dto.categoryId) || original.category
      : original.category;

    // Apply Optimistic Update
    const updatedActivity: Activity = {
      ...original,
      title: dto.title || original.title,
      startTime: dto.startTime || original.startTime,
      endTime: dto.endTime || original.endTime,
      duration,
      categoryId: dto.categoryId || original.categoryId,
      category: cat,
    };

    set({
      activities: get().activities.map((a) => (a.id === id ? updatedActivity : a)).sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      ),
    });

    try {
      const response = await api.patch(`/activities/${id}`, dto);

      // Set clean state with response
      set({
        activities: get().activities.map((a) => (a.id === id ? response.data : a)),
      });

      get().fetchSummary();
      return true;
    } catch (e: any) {
      // Revert
      set({ activities: previousActivities });
      const msg = e.response?.data?.message || 'Failed to adjust activity';
      set({ error: typeof msg === 'string' ? msg : msg[0] });
      return false;
    }
  },

  deleteActivity: async (id) => {
    set({ error: null });
    const previousActivities = get().activities;

    // Apply Optimistic Update
    set({
      activities: get().activities.filter((a) => a.id !== id),
    });

    try {
      await api.delete(`/activities/${id}`);
      get().fetchSummary();
      return true;
    } catch (e: any) {
      // Revert
      set({ activities: previousActivities });
      set({ error: e.response?.data?.message || 'Failed to delete activity' });
      return false;
    }
  },

  createCategory: async (name) => {
    try {
      const response = await api.post('/categories', { name });
      set({ categories: [...get().categories, response.data] });
      return true;
    } catch (e: any) {
      set({ error: e.response?.data?.message || 'Failed to create category' });
      return false;
    }
  },
}));
