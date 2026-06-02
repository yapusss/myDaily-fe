import { create } from 'zustand';
import api from '../services/api';

export interface EventRef {
  id: string;
  title: string;
  startTime: string;
}

export interface Note {
  id: string;
  content: string;
  noteDate: string;
  eventId: string | null;
  event: EventRef | null;
  createdAt: string;
}

interface NoteState {
  notes: Note[];
  isLoading: boolean;
  error: string | null;

  fetchNotes: () => Promise<void>;
  createNote: (note: {
    content: string;
    noteDate: string;
    eventId?: string;
  }) => Promise<boolean>;
  updateNote: (
    id: string,
    note: {
      content?: string;
      noteDate?: string;
      eventId?: string;
    },
  ) => Promise<boolean>;
  deleteNote: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchNotes: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/notes');
      set({ notes: response.data, isLoading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.message || 'Failed to load notes', isLoading: false });
    }
  },

  createNote: async (dto) => {
    set({ error: null });

    const optimisticId = 'opt_note_' + Math.random().toString(36).substr(2, 9);
    const optimisticNote: Note = {
      id: optimisticId,
      content: dto.content,
      noteDate: dto.noteDate,
      eventId: dto.eventId || null,
      event: null,
      createdAt: new Date().toISOString(),
    };

    const previousNotes = get().notes;

    // Apply Optimistic Update
    set({
      notes: [optimisticNote, ...previousNotes],
    });

    try {
      const response = await api.post('/notes', dto);

      // Swap in the real DB response
      set({
        notes: get().notes.map((n) => (n.id === optimisticId ? response.data : n)),
      });

      return true;
    } catch (e: any) {
      // Revert on failure
      set({ notes: previousNotes });
      const msg = e.response?.data?.message || 'Failed to record note';
      set({ error: typeof msg === 'string' ? msg : msg[0] });
      return false;
    }
  },

  updateNote: async (id, dto) => {
    set({ error: null });
    const previousNotes = get().notes;
    const original = previousNotes.find((n) => n.id === id);
    if (!original) return false;

    // Apply Optimistic Update
    const updatedNote: Note = {
      ...original,
      content: dto.content !== undefined ? dto.content : original.content,
      noteDate: dto.noteDate || original.noteDate,
      eventId: dto.eventId !== undefined ? dto.eventId : original.eventId,
    };

    set({
      notes: get().notes.map((n) => (n.id === id ? updatedNote : n)),
    });

    try {
      const response = await api.patch(`/notes/${id}`, dto);

      // Synchronize with API response
      set({
        notes: get().notes.map((n) => (n.id === id ? response.data : n)),
      });

      return true;
    } catch (e: any) {
      // Revert
      set({ notes: previousNotes });
      const msg = e.response?.data?.message || 'Failed to adjust note';
      set({ error: typeof msg === 'string' ? msg : msg[0] });
      return false;
    }
  },

  deleteNote: async (id) => {
    const previousNotes = get().notes;

    // Apply Optimistic Update
    set({
      notes: get().notes.filter((n) => n.id !== id),
    });

    try {
      await api.delete(`/notes/${id}`);
      return true;
    } catch (e: any) {
      // Revert
      set({ notes: previousNotes });
      set({ error: e.response?.data?.message || 'Failed to delete note' });
      return false;
    }
  },
}));
