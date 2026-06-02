import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useActivityStore } from '../store/activityStore';
import { useSettingsStore } from '../store/settingsStore';
import { getTheme } from '../theme/theme';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Trash2 } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { translations } from '../services/i18n';

type ActivityFormScreenRouteProp = RouteProp<RootStackParamList, 'ActivityForm'>;
type ActivityFormScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ActivityForm'>;

interface Props {
  route: ActivityFormScreenRouteProp;
  navigation: ActivityFormScreenNavigationProp;
}

export default function ActivityFormScreen({ route, navigation }: Props) {
  const activityId = route.params?.activityId;

  const isDark = useSettingsStore((state) => state.isDark);
  const language = useSettingsStore((state) => state.language);
  const theme = getTheme(isDark);
  const t = translations[language];

  const {
    activities,
    categories,
    createActivity,
    updateActivity,
    deleteActivity,
    error,
    clearError,
  } = useActivityStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Recurrence states
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<Record<number, boolean>>({
    1: false, // Monday
    2: false, // Tuesday
    3: false, // Wednesday
    4: false, // Thursday
    5: false, // Friday
    6: false, // Saturday
    0: false, // Sunday
  });

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const nextWeek = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
    return nextWeek.toISOString().split('T')[0];
  });

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Time picker states
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });

  const [endTime, setEndTime] = useState(() => {
    const d = new Date();
    d.setHours(10, 0, 0, 0);
    return d;
  });

  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Resolve initial parameters in case of EDIT mode
  const editingActivity = activityId ? activities.find((a) => a.id === activityId) : null;

  useEffect(() => {
    if (editingActivity) {
      const start = new Date(editingActivity.startTime);
      const end = new Date(editingActivity.endTime);
      setStartTime(start);
      setEndTime(end);
    }
  }, [editingActivity]);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: editingActivity?.title || '',
      categoryId: editingActivity?.categoryId || (categories[0]?.id || ''),
      date: (() => {
        const d = editingActivity ? new Date(editingActivity.startTime) : new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })(),
    },
  });

  const selectedCategoryId = watch('categoryId');

  useEffect(() => {
    clearError();
    navigation.setOptions({
      title: editingActivity ? t.editActivityBlock : t.bookActivityBlock,
    });
  }, [language]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      setValue('date', dateString);
    }
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);

    const startStrList: string[] = [];
    const endStrList: string[] = [];

    const sHour = startTime.getHours();
    const sMin = startTime.getMinutes();
    const eHour = endTime.getHours();
    const eMin = endTime.getMinutes();

    if (isRecurring && !editingActivity) {
      const activeDays = Object.entries(selectedDays)
        .filter(([_, value]) => value)
        .map(([key, _]) => Number(key));

      if (activeDays.length === 0) {
        Alert.alert(t.recurringTitle, language === 'id' ? 'Silakan pilih hari pengulangan.' : 'Please select recurrence days.');
        setIsSubmitting(false);
        return;
      }

      const baseDate = new Date(startDate + 'T00:00:00');
      const maxDate = new Date(endDate + 'T23:59:59');

      let cur = new Date(baseDate);
      while (cur <= maxDate) {
        const curDayOfWeek = cur.getDay();
        if (activeDays.includes(curDayOfWeek)) {
          const year = cur.getFullYear();
          const month = cur.getMonth();
          const dateVal = cur.getDate();

          const localStart = new Date(year, month, dateVal, sHour, sMin, 0);
          const localEnd = new Date(year, month, dateVal, eHour, eMin, 0);

          startStrList.push(localStart.toISOString());
          endStrList.push(localEnd.toISOString());
        }
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      const datePart = data.date;
      const [year, monthStr, dayStr] = datePart.split('-').map(Number);
      const localStart = new Date(year, monthStr - 1, dayStr, sHour, sMin, 0);
      const localEnd = new Date(year, monthStr - 1, dayStr, eHour, eMin, 0);

      startStrList.push(localStart.toISOString());
      endStrList.push(localEnd.toISOString());
    }

    let successCount = 0;
    const failures: string[] = [];

    if (editingActivity) {
      const success = await updateActivity(editingActivity.id, {
        title: data.title,
        categoryId: data.categoryId,
        startTime: startStrList[0],
        endTime: endStrList[0],
      });
      if (success) successCount++;
    } else {
      for (let i = 0; i < startStrList.length; i++) {
        const startStr = startStrList[i];
        const endStr = endStrList[i];
        const occDate = startStr.split('T')[0];

        try {
          const success = await createActivity({
            title: data.title,
            categoryId: data.categoryId,
            startTime: startStr,
            endTime: endStr,
          });

          if (success) {
            successCount++;
          } else {
            failures.push(occDate);
          }
        } catch (e) {
          failures.push(occDate);
        }
      }
    }

    setIsSubmitting(false);

    if (isRecurring && !editingActivity) {
      if (failures.length === 0) {
        Alert.alert(t.recurringSuccess, `${successCount} ${language === 'id' ? 'kegiatan rutin berhasil dibuat.' : 'recurring activities created.'}`);
        navigation.goBack();
      } else {
        const failedDates = failures.join(', ');
        Alert.alert(
          language === 'id' ? 'Beberapa kegiatan bentrok' : 'Recurring Conflicts',
          `${t.recurringFailure}\n\n${failedDates}\n\n${language === 'id' ? 'Sisa kegiatan berhasil dibuat.' : 'Other dates were created successfully.'}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } else {
      if (successCount > 0) {
        navigation.goBack();
      }
    }
  };

  const handleDelete = async () => {
    if (!editingActivity) return;

    Alert.alert(t.deleteActivity, t.deleteActivityConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: async () => {
          const success = await deleteActivity(editingActivity.id);
          if (success) {
            navigation.goBack();
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.formContainer}>
        {error && (
          <View style={[styles.errorCard, { backgroundColor: theme.colors.danger + '15', borderColor: theme.colors.danger }]}>
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
          </View>
        )}

        {/* Title Field */}
        <Text style={[styles.label, { color: theme.colors.text }]}>{t.activityTitle}</Text>
        <Controller
          control={control}
          rules={{ required: t.validationTitle }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: errors.title ? theme.colors.danger : theme.colors.border,
                },
              ]}
              placeholder="e.g. Coding Session"
              placeholderTextColor={theme.colors.textSecondary}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
          name="title"
        />
        {errors.title && <Text style={[styles.validationError, { color: theme.colors.danger }]}>{errors.title.message}</Text>}

        {/* Category Selector */}
        <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>{t.category}</Text>
        <View style={styles.categoryContainer}>
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryBadge,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.card,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setValue('categoryId', cat.id)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: isSelected ? '#ffffff' : theme.colors.text },
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Date Field with native Date Picker (Hidden when recurring) */}
        {!isRecurring && (
          <View>
            <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>{t.date}</Text>
            <Controller
              control={control}
              rules={{ required: !isRecurring ? t.validationDate : false }}
              render={({ field: { value } }) => (
                <View>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: errors.date ? theme.colors.danger : theme.colors.border,
                        justifyContent: 'center',
                      },
                    ]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={{ color: value ? theme.colors.text : theme.colors.textSecondary, fontSize: 16 }}>
                      {value || 'Select Date'}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={value ? new Date(value + 'T00:00:00') : new Date()}
                      mode="date"
                      display="default"
                      onChange={onDateChange}
                    />
                  )}
                </View>
              )}
              name="date"
            />
            {errors.date && <Text style={[styles.validationError, { color: theme.colors.danger }]}>{errors.date.message}</Text>}
          </View>
        )}

        {/* Recurring Toggle (Only when creating new activity) */}
        {!editingActivity && (
          <View style={{ marginTop: 16 }}>
            <View style={styles.recurringRow}>
              <Text style={[styles.label, { color: theme.colors.text, marginBottom: 0 }]}>{t.recurringTitle}</Text>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
                thumbColor={isRecurring ? theme.colors.primary : '#f4f3f4'}
              />
            </View>

            {isRecurring && (
              <View style={[styles.recurringBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                {/* Day of Week Selector */}
                <Text style={[styles.recurringSubLabel, { color: theme.colors.text }]}>{t.recurringDays}</Text>
                <View style={styles.daysRow}>
                  {[
                    { id: 1, label: t.monday },
                    { id: 2, label: t.tuesday },
                    { id: 3, label: t.wednesday },
                    { id: 4, label: t.thursday },
                    { id: 5, label: t.friday },
                    { id: 6, label: t.saturday },
                    { id: 0, label: t.sunday },
                  ].map((day) => {
                    const isDaySelected = selectedDays[day.id];
                    return (
                      <TouchableOpacity
                        key={day.id}
                        style={[
                          styles.dayCircle,
                          {
                            backgroundColor: isDaySelected ? theme.colors.primary : theme.colors.background,
                            borderColor: isDaySelected ? theme.colors.primary : theme.colors.border,
                          },
                        ]}
                        onPress={() => setSelectedDays({ ...selectedDays, [day.id]: !isDaySelected })}
                      >
                        <Text style={[styles.dayText, { color: isDaySelected ? '#ffffff' : theme.colors.text, fontSize: 11 }]}>
                          {day.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Start Date and End Date Rollers */}
                <View style={[styles.timeInputsRow, { marginBottom: 0, marginTop: 16 }]}>
                  <View style={styles.timeHalfColumn}>
                    <Text style={[styles.recurringSubLabel, { color: theme.colors.text }]}>{language === 'id' ? 'Tanggal Mulai' : 'Start Date'}</Text>
                    <TouchableOpacity
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.colors.background,
                          borderColor: theme.colors.border,
                          justifyContent: 'center',
                        },
                      ]}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <Text style={{ color: theme.colors.text, fontSize: 14, textAlign: 'center' }}>
                        {startDate}
                      </Text>
                    </TouchableOpacity>
                    {showStartDatePicker && (
                      <DateTimePicker
                        value={new Date(startDate + 'T00:00:00')}
                        mode="date"
                        display="default"
                        onChange={(e, date) => {
                          setShowStartDatePicker(false);
                          if (date) {
                            setStartDate(date.toISOString().split('T')[0]);
                          }
                        }}
                      />
                    )}
                  </View>

                  <View style={styles.timeHalfColumn}>
                    <Text style={[styles.recurringSubLabel, { color: theme.colors.text }]}>{language === 'id' ? 'Tanggal Selesai' : 'End Date'}</Text>
                    <TouchableOpacity
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.colors.background,
                          borderColor: theme.colors.border,
                          justifyContent: 'center',
                        },
                      ]}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Text style={{ color: theme.colors.text, fontSize: 14, textAlign: 'center' }}>
                        {endDate}
                      </Text>
                    </TouchableOpacity>
                    {showEndDatePicker && (
                      <DateTimePicker
                        value={new Date(endDate + 'T00:00:00')}
                        mode="date"
                        display="default"
                        onChange={(e, date) => {
                          setShowEndDatePicker(false);
                          if (date) {
                            setEndDate(date.toISOString().split('T')[0]);
                          }
                        }}
                      />
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Time Pickers (Rollers/Pickers) */}
        <View style={styles.timeInputsRow}>
          <View style={styles.timeHalfColumn}>
            <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>{t.startTime}</Text>
            <TouchableOpacity
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}
              onPress={() => setShowStartTimePicker(true)}
            >
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700' }}>
                {String(startTime.getHours()).padStart(2, '0')}:{String(startTime.getMinutes()).padStart(2, '0')}
              </Text>
            </TouchableOpacity>
            {showStartTimePicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                display="spinner"
                onChange={(e, date) => {
                  setShowStartTimePicker(false);
                  if (date) setStartTime(date);
                }}
              />
            )}
          </View>

          <View style={styles.timeHalfColumn}>
            <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>{t.endTime}</Text>
            <TouchableOpacity
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}
              onPress={() => setShowEndTimePicker(true)}
            >
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700' }}>
                {String(endTime.getHours()).padStart(2, '0')}:{String(endTime.getMinutes()).padStart(2, '0')}
              </Text>
            </TouchableOpacity>
            {showEndTimePicker && (
              <DateTimePicker
                value={endTime}
                mode="time"
                display="spinner"
                onChange={(e, date) => {
                  setShowEndTimePicker(false);
                  if (date) setEndTime(date);
                }}
              />
            )}
          </View>
        </View>

        {/* Submit Actions */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitText}>{editingActivity ? t.saveChanges : t.confirmAllocation}</Text>
          )}
        </TouchableOpacity>

        {editingActivity && (
          <TouchableOpacity
            style={[styles.deleteButton, { borderColor: theme.colors.danger }]}
            onPress={handleDelete}
          >
            <Trash2 size={18} color={theme.colors.danger} />
            <Text style={[styles.deleteText, { color: theme.colors.danger }]}>{t.deleteActivity}</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContainer: {
    padding: 24,
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  validationError: {
    fontSize: 12,
    marginTop: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  categoryBadge: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeInputsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  timeHalfColumn: {
    width: '46%',
  },
  submitButton: {
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    flexDirection: 'row',
    height: 52,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  // Recurring styles
  recurringRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recurringBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  recurringSubLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontWeight: '700',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  durationText: {
    fontWeight: '600',
  },
});
