import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { useEventStore, Event, ReminderInfo } from '../store/eventStore';
import { useNoteStore } from '../store/noteStore';
import { getTheme } from '../theme/theme';
import { Calendar, Clock, Bell, Plus, Trash2, FileText, ChevronRight, Edit3 } from 'lucide-react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import DateTimePicker from '@react-native-community/datetimepicker';
import { translations } from '../services/i18n';

type EventDetailScreenRouteProp = RouteProp<RootStackParamList, 'EventDetail'>;
type EventDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EventDetail'>;

interface Props {
  route: EventDetailScreenRouteProp;
  navigation: EventDetailScreenNavigationProp;
}

export default function EventDetailScreen({ route, navigation }: Props) {
  const eventId = route.params.eventId;

  const isDark = useSettingsStore((state) => state.isDark);
  const language = useSettingsStore((state) => state.language);
  const theme = getTheme(isDark);
  const t = translations[language];

  const {
    events,
    updateEvent,
    deleteEvent,
    addReminder,
    deleteReminder,
    error,
  } = useEventStore();

  const {
    notes,
    createNote,
  } = useNoteStore();

  const [noteContent, setNoteContent] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Edit Mode states
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDate, setEditDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Resolve event details
  const event = events.find((e) => e.id === eventId);

  useEffect(() => {
    if (event) {
      setEditTitle(event.title);
      setEditDesc(event.description || '');
      const localStart = new Date(event.startTime);
      const year = localStart.getFullYear();
      const month = String(localStart.getMonth() + 1).padStart(2, '0');
      const day = String(localStart.getDate()).padStart(2, '0');
      setEditDate(`${year}-${month}-${day}`);
      setStartTime(new Date(event.startTime));
      setEndTime(new Date(event.endTime));
    }
  }, [event, isEditing]);

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContainer}>
          <Text style={{ color: theme.colors.text }}>
            {language === 'id' ? 'Acara kalender tidak ditemukan.' : 'Calendar Event not found.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Format details
  const dateStr = new Date(event.startTime).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const start = new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const end = new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Filter notes linked to this event
  const linkedNotes = notes.filter((n) => n.eventId === eventId);

  // Handlers
  const handleAddPredefinedReminder = async (minutesBefore: number, label: string) => {
    const startTimeMs = new Date(event.startTime).getTime();
    const triggerTime = startTimeMs - minutesBefore * 60000;

    if (triggerTime <= Date.now()) {
      Alert.alert(
        language === 'id' ? 'Pengingat Tidak Valid' : 'Invalid Alert',
        language === 'id' ? 'Pengingat ini harus terjadi di waktu mendatang!' : 'This reminder trigger date would occur in the past!'
      );
      return;
    }

    const remindAtStr = new Date(triggerTime).toISOString();
    const success = await addReminder(event.id, remindAtStr);

    if (success) {
      Alert.alert(
        language === 'id' ? 'Pengingat Berhasil' : 'Reminder Set',
        language === 'id' ? `Notifikasi pengingat telah dijadwalkan untuk ${label}.` : `A notification reminder has been scheduled for ${label}.`
      );
    } else {
      Alert.alert('Error', error || 'Failed to add reminder');
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;

    setIsSubmittingNote(true);
    const success = await createNote({
      content: noteContent.trim(),
      noteDate: new Date(event.startTime).toISOString(),
      eventId: event.id,
    });

    setIsSubmittingNote(false);
    if (success) {
      setNoteContent('');
      Alert.alert(
        language === 'id' ? 'Catatan Disimpan' : 'Note Saved',
        language === 'id' ? 'Catatan refleksi berhasil ditautkan.' : 'Your reflection note has been linked successfully.'
      );
    }
  };

  const handleDeleteEvent = () => {
    Alert.alert(
      language === 'id' ? 'Batalkan Acara' : 'Cancel Event',
      language === 'id' ? 'Apakah Anda yakin ingin membatalkan acara ini?' : 'Are you sure you want to cancel this event?',
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: language === 'id' ? 'Hapus' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteEvent(event.id);
            if (success) {
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const handleSaveChanges = async () => {
    if (!editTitle.trim()) {
      Alert.alert('Error', language === 'id' ? 'Nama kegiatan wajib diisi' : 'Event title is required');
      return;
    }

    setIsSaving(true);
    const startHour = startTime.getHours();
    const startMin = startTime.getMinutes();
    const endHour = endTime.getHours();
    const endMin = endTime.getMinutes();

    const [year, monthStr, dayStr] = editDate.split('-').map(Number);
    const localStart = new Date(year, monthStr - 1, dayStr, startHour, startMin, 0);
    const localEnd = new Date(year, monthStr - 1, dayStr, endHour, endMin, 0);

    const success = await updateEvent(event.id, {
      title: editTitle.trim(),
      description: editDesc.trim(),
      startTime: localStart.toISOString(),
      endTime: localEnd.toISOString(),
    });

    setIsSaving(false);
    if (success) {
      setIsEditing(false);
      Alert.alert('Success', language === 'id' ? 'Detail acara berhasil diperbarui.' : 'Event details updated successfully.');
    } else {
      Alert.alert('Error', error || 'Failed to update event.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {isEditing ? (
          /* EDIT MODE FORM */
          <View style={[styles.detailsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.editHeaderTitle, { color: theme.colors.text }]}>
              {language === 'id' ? 'Ubah Detail Acara' : 'Edit Event Details'}
            </Text>

            {/* Nama Kegiatan */}
            <Text style={[styles.subLabel, { color: theme.colors.text, marginTop: 8 }]}>
              {language === 'id' ? 'Nama Kegiatan' : 'Event Title'}
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder={language === 'id' ? 'e.g. Rapat Koordinasi' : 'Event Title'}
              placeholderTextColor={theme.colors.textSecondary}
            />

            {/* Deskripsi Kegiatan */}
            <Text style={[styles.subLabel, { color: theme.colors.text, marginTop: 12 }]}>
              {language === 'id' ? 'Deskripsi' : 'Description'}
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border, height: 60 }]}
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder={language === 'id' ? 'e.g. Membahas proyek baru' : 'Event Description'}
              placeholderTextColor={theme.colors.textSecondary}
              multiline
            />

            {/* Pemilihan Tanggal */}
            <Text style={[styles.subLabel, { color: theme.colors.text, marginTop: 12 }]}>
              {language === 'id' ? 'Tanggal' : 'Date'}
            </Text>
            <TouchableOpacity
              style={[styles.dateSelector, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }}>{editDate}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={new Date(editDate + 'T00:00:00')}
                mode="date"
                display="default"
                onChange={(e, d) => {
                  setShowDatePicker(false);
                  if (d) {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    setEditDate(`${year}-${month}-${day}`);
                  }
                }}
              />
            )}

            {/* Roller Jam dan Menit Mulai & Selesai */}
            <View style={[styles.timeInputsRow, { marginTop: 12, marginBottom: 0 }]}>
              <View style={styles.timeHalfColumn}>
                <Text style={[styles.subLabel, { color: theme.colors.text }]}>
                  {language === 'id' ? 'Waktu Mulai' : 'Start Time'}
                </Text>
                <TouchableOpacity
                  style={[styles.timeSelector, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700' }}>
                    {String(startTime.getHours()).padStart(2, '0')}:{String(startTime.getMinutes()).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
                {showStartTimePicker && (
                  <DateTimePicker
                    value={startTime}
                    mode="time"
                    display="spinner"
                    onChange={(e, d) => {
                      setShowStartTimePicker(false);
                      if (d) setStartTime(d);
                    }}
                  />
                )}
              </View>

              <View style={styles.timeHalfColumn}>
                <Text style={[styles.subLabel, { color: theme.colors.text }]}>
                  {language === 'id' ? 'Waktu Selesai' : 'End Time'}
                </Text>
                <TouchableOpacity
                  style={[styles.timeSelector, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700' }}>
                    {String(endTime.getHours()).padStart(2, '0')}:{String(endTime.getMinutes()).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
                {showEndTimePicker && (
                  <DateTimePicker
                    value={endTime}
                    mode="time"
                    display="spinner"
                    onChange={(e, d) => {
                      setShowEndTimePicker(false);
                      if (d) setEndTime(d);
                    }}
                  />
                )}
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.editActionsRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.colors.border }]}
                onPress={() => setIsEditing(false)}
                disabled={isSaving}
              >
                <Text style={[styles.cancelBtnText, { color: theme.colors.text }]}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveChanges}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>{t.save}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* VIEW MODE - STANDARD DETAILS */
          <View style={[styles.detailsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.detailsHeader}>
              <Text style={[styles.title, { color: theme.colors.text, flex: 1 }]}>{event.title}</Text>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: theme.colors.primary + '15' }]}
                onPress={() => setIsEditing(true)}
              >
                <Edit3 size={16} color={theme.colors.primary} />
                <Text style={[styles.editButtonText, { color: theme.colors.primary }]}>
                  {language === 'id' ? 'Ubah' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {event.description || (language === 'id' ? 'Tidak ada deskripsi.' : 'No description provided.')}
            </Text>

            <View style={styles.metaRow}>
              <Calendar size={18} color={theme.colors.primary} />
              <Text style={[styles.metaText, { color: theme.colors.text }]}>{dateStr}</Text>
            </View>

            <View style={[styles.metaRow, { marginTop: 10 }]}>
              <Clock size={18} color={theme.colors.primary} />
              <Text style={[styles.metaText, { color: theme.colors.text }]}>{start} - {end}</Text>
            </View>
          </View>
        )}

        {/* Reminders section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {language === 'id' ? 'Pengingat' : 'Reminders'}
          </Text>
        </View>

        <View style={[styles.innerCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {/* List existing */}
          {(!event.reminders || event.reminders.length === 0) ? (
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {language === 'id' ? 'Belum ada pengingat aktif.' : 'No active notification reminders set.'}
            </Text>
          ) : (
            <View style={styles.remindersList}>
              {event.reminders.map((rem) => {
                const triggerStr = new Date(rem.remindAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <View key={rem.id} style={styles.reminderItem}>
                    <View style={styles.reminderItemLeft}>
                      <Bell size={16} color={rem.isSent ? theme.colors.textSecondary : theme.colors.success} />
                      <Text style={[styles.reminderText, { color: theme.colors.text }]}>
                        {language === 'id' ? 'Pengingat pada' : 'Alert at'} {triggerStr} {rem.isSent ? (language === 'id' ? '(Terkirim)' : '(Sent)') : (language === 'id' ? '(Terjadwal)' : '(Scheduled)')}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteReminder(rem.id, event.id)}>
                      <Trash2 size={16} color={theme.colors.danger} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Quick preset setters */}
          <Text style={[styles.subLabel, { color: theme.colors.text, marginTop: 16 }]}>
            {language === 'id' ? 'Jadwalkan Pengingat Push' : 'Schedule Push Reminder'}
          </Text>
          <View style={styles.reminderPresetContainer}>
            <TouchableOpacity
              style={[styles.presetButton, { borderColor: theme.colors.border }]}
              onPress={() => handleAddPredefinedReminder(15, language === 'id' ? '15 menit sebelum' : '15 minutes before')}
            >
              <Text style={[styles.presetText, { color: theme.colors.text }]}>15 {language === 'id' ? 'menit' : 'mins'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetButton, { borderColor: theme.colors.border }]}
              onPress={() => handleAddPredefinedReminder(30, language === 'id' ? '30 menit sebelum' : '30 minutes before')}
            >
              <Text style={[styles.presetText, { color: theme.colors.text }]}>30 {language === 'id' ? 'menit' : 'mins'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetButton, { borderColor: theme.colors.border }]}
              onPress={() => handleAddPredefinedReminder(60, language === 'id' ? '1 jam sebelum' : '1 hour before')}
            >
              <Text style={[styles.presetText, { color: theme.colors.text }]}>1 {language === 'id' ? 'jam' : 'hr'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Linked notes section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {language === 'id' ? 'Catatan Terkait' : 'Linked Notes'}
          </Text>
        </View>

        <View style={[styles.innerCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {linkedNotes.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {language === 'id' ? 'Belum ada catatan untuk acara ini.' : 'No notes linked to this event yet.'}
            </Text>
          ) : (
            <View style={styles.linkedNotesList}>
              {linkedNotes.map((note) => (
                <View key={note.id} style={styles.noteItem}>
                  <FileText size={16} color={theme.colors.primary} />
                  <Text style={[styles.noteContentText, { color: theme.colors.text }]} numberOfLines={2}>
                    {note.content}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Add a quick note field */}
          <TextInput
            style={[
              styles.noteTextInput,
              {
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
            placeholder={language === 'id' ? 'Tulis catatan refleksi...' : 'Type a reflection note to link...'}
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={3}
            value={noteContent}
            onChangeText={setNoteContent}
          />
          <TouchableOpacity
            style={[styles.addNoteBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleAddNote}
            disabled={isSubmittingNote || !noteContent.trim()}
          >
            <Plus size={16} color="#ffffff" />
            <Text style={styles.addNoteBtnText}>
              {language === 'id' ? 'Tambah Catatan' : 'Add Note'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Delete Event Button */}
        <TouchableOpacity
          style={[styles.deleteEventBtn, { borderColor: theme.colors.danger }]}
          onPress={handleDeleteEvent}
        >
          <Trash2 size={18} color={theme.colors.danger} />
          <Text style={[styles.deleteEventBtnText, { color: theme.colors.danger }]}>
            {language === 'id' ? 'Batalkan Acara' : 'Cancel Event'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  detailsCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  innerCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
  },
  remindersList: {
    gap: 12,
  },
  reminderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  reminderItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reminderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  reminderPresetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  presetButton: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  presetText: {
    fontSize: 11,
    fontWeight: '600',
  },
  linkedNotesList: {
    gap: 12,
    marginBottom: 16,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  noteContentText: {
    fontSize: 13,
    flex: 1,
  },
  noteTextInput: {
    height: 60,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  addNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  addNoteBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  deleteEventBtn: {
    flexDirection: 'row',
    height: 52,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  deleteEventBtnText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  // Edit mode styles
  editHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 10,
  },
  dateSelector: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  timeSelector: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeInputsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeHalfColumn: {
    width: '46%',
  },
  editActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  saveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
