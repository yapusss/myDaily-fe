import { create } from 'zustand';
import api from '../services/api';

export interface NoteInfo {
  id: string;
  content: string;
  noteDate: string;
}

export interface ReminderInfo {
  id: string;
  remindAt: string;
  isSent: boolean;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  createdAt: string;
  notes?: NoteInfo[];
  reminders?: ReminderInfo[];
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  isNational: boolean;
}

interface EventState {
  events: Event[];
  holidays: Holiday[];
  selectedDate: string;
  isLoading: boolean;
  error: string | null;

  setSelectedDate: (date: string) => void;
  fetchEvents: (date?: string, month?: string) => Promise<void>;
  fetchHolidays: (year?: string) => Promise<void>;
  createEvent: (event: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
  }) => Promise<string | null>;
  updateEvent: (
    id: string,
    event: {
      title?: string;
      description?: string;
      startTime?: string;
      endTime?: string;
    },
  ) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;
  addReminder: (eventId: string, remindAt: string) => Promise<boolean>;
  deleteReminder: (reminderId: string, eventId: string) => Promise<boolean>;
  clearError: () => void;
}

// Get current date string in local YYYY-MM-DD
const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  holidays: [],
  selectedDate: getTodayString(),
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  setSelectedDate: (selectedDate) => set({ selectedDate }),

  fetchEvents: async (date, month) => {
    set({ isLoading: true, error: null });
    try {
      const params: Record<string, string> = {};
      if (date) params.date = date;
      if (month) params.month = month;

      const response = await api.get('/events', { params });
      set({ events: response.data, isLoading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.message || 'Failed to load events', isLoading: false });
    }
  },

  fetchHolidays: async (year) => {
    try {
      const params: Record<string, string> = {};
      if (year) params.year = year;

      const response = await api.get('/holidays', { params });
      set({ holidays: response.data });
    } catch (e) {
      console.warn('Failed to load holidays:', e);
    }
  },

  createEvent: async (dto) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/events', dto);
      const newEvent = response.data;

      set({
        events: [...get().events, newEvent].sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        ),
        isLoading: false,
      });

      return newEvent.id;
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to book event';
      set({ error: typeof msg === 'string' ? msg : msg[0], isLoading: false });
      return null;
    }
  },

  updateEvent: async (id, dto) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.patch(`/events/${id}`, dto);
      const updated = response.data;

      set({
        events: get().events.map((e) => (e.id === id ? { ...e, ...updated } : e)),
        isLoading: false,
      });
      return true;
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to adjust event';
      set({ error: typeof msg === 'string' ? msg : msg[0], isLoading: false });
      return false;
    }
  },

  deleteEvent: async (id) => {
    const previous = get().events;
    set({ events: previous.filter((e) => e.id !== id) });

    try {
      await api.delete(`/events/${id}`);
      return true;
    } catch (e: any) {
      set({ events: previous, error: e.response?.data?.message || 'Failed to cancel event' });
      return false;
    }
  },

  addReminder: async (eventId, remindAt) => {
    try {
      const response = await api.post('/reminders', { eventId, remindAt });
      const newReminder = response.data;

      // Update local event item reminders list
      set({
        events: get().events.map((e) => {
          if (e.id === eventId) {
            const list = e.reminders || [];
            return { ...e, reminders: [...list, newReminder] };
          }
          return e;
        }),
      });

      return true;
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to add reminder';
      set({ error: typeof msg === 'string' ? msg : msg[0] });
      return false;
    }
  },

  deleteReminder: async (reminderId, eventId) => {
    try {
      await api.delete(`/reminders/${reminderId}`);

      set({
        events: get().events.map((e) => {
          if (e.id === eventId) {
            const list = e.reminders || [];
            return { ...e, reminders: list.filter((r) => r.id !== reminderId) };
          }
          return e;
        }),
      });

      return true;
    } catch (e: any) {
      set({ error: e.response?.data?.message || 'Failed to cancel reminder' });
      return false;
    }
  },
}));
