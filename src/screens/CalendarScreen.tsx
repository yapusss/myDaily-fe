import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { useEventStore, Event, Holiday } from '../store/eventStore';
import { getTheme } from '../theme/theme';
import { ChevronLeft, ChevronRight, Plus, MapPin, Gift, Clock } from 'lucide-react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type CalendarScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

interface Props {
  navigation: CalendarScreenNavigationProp;
}

export default function CalendarScreen({ navigation }: Props) {
  const isDark = useSettingsStore((state) => state.isDark);
  const language = useSettingsStore((state) => state.language);
  const theme = getTheme(isDark);

  const {
    events,
    holidays,
    selectedDate,
    isLoading,
    setSelectedDate,
    fetchEvents,
    fetchHolidays,
    createEvent,
  } = useEventStore();

  const [currentDate, setCurrentDate] = useState(new Date());

  // 1. Initial Load & Fetch on month change
  useEffect(() => {
    const yearStr = String(currentDate.getFullYear());
    const monthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
    const monthQuery = `${yearStr}-${monthStr}`;

    fetchEvents(undefined, monthQuery);
    fetchHolidays(yearStr);
  }, [currentDate]);

  // 2. Month Navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // 3. Grid calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);

  const startDayIndex = startOfMonth.getDay(); // 0 is Sunday, 1 is Monday...
  const totalDays = endOfMonth.getDate();

  const calendarCells: (number | null)[] = [];
  // Pad beginning cells
  for (let i = 0; i < startDayIndex; i++) {
    calendarCells.push(null);
  }
  // Fill day numbers
  for (let i = 1; i <= totalDays; i++) {
    calendarCells.push(i);
  }

  // Resolve events and holidays by specific day
  const getDayDetails = (dayNum: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayEvents = events.filter((e) => new Date(e.startTime).toISOString().split('T')[0] === dateStr);
    const dayHolidays = holidays.filter((h) => new Date(h.date).toISOString().split('T')[0] === dateStr);

    return {
      dateStr,
      hasEvents: dayEvents.length > 0,
      hasHolidays: dayHolidays.length > 0,
      dayEvents,
      dayHolidays,
    };
  };

  // Resolve current active selected date's lists
  const getSelectedDayDetails = () => {
    const selectedDayEvents = events.filter(
      (e) => new Date(e.startTime).toISOString().split('T')[0] === selectedDate,
    );
    const selectedDayHolidays = holidays.filter(
      (h) => new Date(h.date).toISOString().split('T')[0] === selectedDate,
    );

    return {
      selectedDayEvents,
      selectedDayHolidays,
    };
  };

  const { selectedDayEvents, selectedDayHolidays } = getSelectedDayDetails();

  const monthNames = language === 'id' ? [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ] : [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const daysOfWeek = language === 'id'
    ? ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Handle Quick Add Event
  const handleQuickAddEvent = async () => {
    const defaultStart = `${selectedDate}T09:00:00.000Z`;
    const defaultEnd = `${selectedDate}T10:00:00.000Z`;

    const eventId = await createEvent({
      title: language === 'id' ? 'Acara Kalender Baru' : 'New Calendar Event',
      description: language === 'id' ? 'Blok acara terjadwal cepat.' : 'Quick scheduled event block.',
      startTime: defaultStart,
      endTime: defaultEnd,
    });

    if (eventId) {
      navigation.navigate('EventDetail', { eventId });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Month Picker Header */}
        <View style={[styles.monthHeader, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <TouchableOpacity onPress={prevMonth} style={styles.headerNavButton}>
            <ChevronLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: theme.colors.text }]}>
            {monthNames[month]} {year}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.headerNavButton}>
            <ChevronRight size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid Card */}
        <View style={[styles.gridCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {/* Days labels */}
          <View style={styles.weekLabelsRow}>
            {daysOfWeek.map((day) => (
              <Text key={day} style={[styles.weekLabelText, { color: theme.colors.textSecondary }]}>
                {day}
              </Text>
            ))}
          </View>

          {/* Grid Cells */}
          <View style={styles.gridCellsContainer}>
            {calendarCells.map((day, idx) => {
              if (day === null) {
                return <View key={`pad_${idx}`} style={styles.gridCellPad} />;
              }

              const { dateStr, hasEvents, hasHolidays } = getDayDetails(day);
              const isSelected = selectedDate === dateStr;

              return (
                <TouchableOpacity
                  key={`day_${day}`}
                  style={[
                    styles.gridCellButton,
                    isSelected && { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={() => setSelectedDate(dateStr)}
                >
                  <Text
                    style={[
                      styles.cellNumber,
                      { color: isSelected ? '#ffffff' : theme.colors.text },
                      isSelected && { fontWeight: 'bold' },
                    ]}
                  >
                    {day}
                  </Text>
                  {/* Dots markers */}
                  <View style={styles.dotsRow}>
                    {hasHolidays && (
                      <View style={[styles.markerDot, { backgroundColor: theme.colors.warning }]} />
                    )}
                    {hasEvents && (
                      <View
                        style={[
                          styles.markerDot,
                          { backgroundColor: isSelected ? '#ffffff' : theme.colors.accent },
                        ]}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Day Agenda Headers */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {language === 'id' ? 'Agenda untuk ' : 'Agenda for '}{new Date(selectedDate + 'T00:00:00').toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
          <TouchableOpacity
            style={[styles.quickAddBtn, { backgroundColor: theme.colors.primary + '15' }]}
            onPress={handleQuickAddEvent}
          >
            <Plus size={16} color={theme.colors.primary} />
            <Text style={[styles.quickAddText, { color: theme.colors.primary }]}>{language === 'id' ? 'Jadwalkan' : 'Book Event'}</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.tint} style={{ marginTop: 20 }} />
        ) : selectedDayEvents.length === 0 && selectedDayHolidays.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {language === 'id' ? 'Belum ada acara yang terjadwal untuk tanggal ini.' : 'No events scheduled for this date.'}
            </Text>
          </View>
        ) : (
          <View style={styles.agendaList}>
            {/* Holidays first */}
            {selectedDayHolidays.map((holiday) => (
              <View
                key={holiday.id}
                style={[
                  styles.agendaItem,
                  {
                    backgroundColor: theme.colors.warning + '10',
                    borderColor: theme.colors.warning,
                  },
                ]}
              >
                <Gift size={20} color={theme.colors.warning} />
                <View style={styles.agendaContent}>
                  <Text style={[styles.agendaTitle, { color: theme.colors.text }]}>{holiday.name}</Text>
                  <Text style={[styles.agendaSubtitle, { color: theme.colors.textSecondary }]}>
                    National Holiday
                  </Text>
                </View>
              </View>
            ))}

            {/* Events */}
            {selectedDayEvents.map((event) => {
              const start = new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const end = new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <TouchableOpacity
                  key={event.id}
                  style={[
                    styles.agendaItem,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                >
                  <Clock size={20} color={theme.colors.accent} />
                  <View style={styles.agendaContent}>
                    <Text style={[styles.agendaTitle, { color: theme.colors.text }]}>{event.title}</Text>
                    <Text style={[styles.agendaSubtitle, { color: theme.colors.textSecondary }]}>
                      {start} - {end}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
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
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  headerNavButton: {
    padding: 4,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  gridCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  weekLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weekLabelText: {
    width: '14.28%',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 13,
  },
  gridCellsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCellPad: {
    width: '14.28%',
    aspectRatio: 1,
  },
  gridCellButton: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  cellNumber: {
    fontSize: 15,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    height: 4,
    marginTop: 4,
  },
  markerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  quickAddText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 14,
  },
  agendaList: {
    gap: 12,
  },
  agendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  agendaContent: {
    flex: 1,
    marginLeft: 16,
  },
  agendaTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  agendaSubtitle: {
    fontSize: 13,
  },
});
