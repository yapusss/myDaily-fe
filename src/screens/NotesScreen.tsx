import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { useNoteStore, Note } from '../store/noteStore';
import { getTheme } from '../theme/theme';
import { Trash2, FileText, Send, Calendar } from 'lucide-react-native';

export default function NotesScreen() {
  const isDark = useSettingsStore((state) => state.isDark);
  const language = useSettingsStore((state) => state.language);
  const theme = getTheme(isDark);

  const {
    notes,
    isLoading,
    error,
    fetchNotes,
    createNote,
    deleteNote,
  } = useNoteStore();

  const [noteContent, setNoteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setRefreshing(true);
    await fetchNotes();
    setRefreshing(false);
  };

  const handleCreateNote = async () => {
    if (!noteContent.trim()) return;

    setIsSubmitting(true);
    const todayISOStr = new Date().toISOString();

    const success = await createNote({
      content: noteContent.trim(),
      noteDate: todayISOStr,
    });

    setIsSubmitting(false);
    if (success) {
      setNoteContent('');
    }
  };

  const handleDeleteNote = (id: string) => {
    Alert.alert(
      language === 'id' ? 'Hapus Catatan' : 'Delete Note',
      language === 'id' ? 'Apakah Anda yakin ingin menghapus refleksi pikiran ini?' : 'Are you sure you want to delete this thought reflection?',
      [
        { text: language === 'id' ? 'Batal' : 'Cancel', style: 'cancel' },
        {
          text: language === 'id' ? 'Hapus' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteNote(id);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Thoughts Composition Header */}
      <View style={[styles.inputBar, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          placeholder={language === 'id' ? 'Tulis ide cepat atau refleksi...' : 'Jot down a quick thought or reflection...'}
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          numberOfLines={2}
          value={noteContent}
          onChangeText={setNoteContent}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: noteContent.trim() ? theme.colors.primary : theme.colors.border,
            },
          ]}
          onPress={handleCreateNote}
          disabled={!noteContent.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Send size={18} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>

      {/* List container */}
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={theme.colors.tint} />
        }
      >
        {error && (
          <View style={[styles.errorCard, { backgroundColor: theme.colors.danger + '15', borderColor: theme.colors.danger }]}>
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
          </View>
        )}

        {notes.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <FileText size={36} color={theme.colors.textSecondary} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
              {language === 'id' ? 'Belum ada catatan yang direkam. Gunakan kolom atas untuk menulis refleksi.' : 'No thoughts recorded yet. Use the top bar to jot down reflections.'}
            </Text>
          </View>
        ) : (
          <View style={styles.notesList}>
            {notes.map((note) => {
              const formattedDate = new Date(note.noteDate).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <View
                  key={note.id}
                  style={[styles.noteCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                >
                  <View style={styles.noteHeader}>
                    <View style={styles.noteHeaderLeft}>
                      <Calendar size={14} color={theme.colors.primary} />
                      <Text style={[styles.noteDateText, { color: theme.colors.textSecondary }]}>
                        {formattedDate}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteNote(note.id)}>
                      <Trash2 size={16} color={theme.colors.danger} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.noteTextContent, { color: theme.colors.text }]}>
                    {note.content}
                  </Text>

                  {note.event && (
                    <View style={[styles.linkedEventTag, { backgroundColor: theme.colors.accent + '12' }]}>
                      <Text style={[styles.linkedEventText, { color: theme.colors.accent }]}>
                        {language === 'id' ? 'Terkait' : 'Linked'}: {note.event.title}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  textInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  errorCard: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  notesList: {
    gap: 16,
  },
  noteCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  noteHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteDateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noteTextContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  linkedEventTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 12,
  },
  linkedEventText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
