import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useActivityStore } from '../store/activityStore';
import { getTheme } from '../theme/theme';
import { registerForPushNotificationsAsync, sendTokenToBackend } from '../services/notifications';
import { Plus, Clock, BarChart3, ChevronRight } from 'lucide-react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { translations } from '../services/i18n';

type DashboardScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

interface Props {
  navigation: DashboardScreenNavigationProp;
}

export default function DashboardScreen({ navigation }: Props) {
  const user = useAuthStore((state) => state.user);
  const isDark = useSettingsStore((state) => state.isDark);
  const language = useSettingsStore((state) => state.language);
  const theme = getTheme(isDark);
  const t = translations[language];

  const {
    activities,
    summary,
    isLoading,
    fetchActivities,
    fetchCategories,
    fetchSummary,
  } = useActivityStore();

  const [refreshing, setRefreshing] = useState(false);

  // 1. Initial Load & Push Notifications Permission setup
  useEffect(() => {
    loadData();
    setupNotifications();
  }, []);

  const loadData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchActivities(),
      fetchCategories(),
      fetchSummary(),
    ]);
    setRefreshing(false);
  };

  const setupNotifications = async () => {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      await sendTokenToBackend(token);
    }
  };

  // 2. Computed Metrics
  // Filter activities booked for "today" (local time)
  const getTodayActivities = () => {
    const todayStr = new Date().toDateString();
    return activities.filter((act) => new Date(act.startTime).toDateString() === todayStr);
  };

  const todayActivities = getTodayActivities();
  const todayTotalMinutes = todayActivities.reduce((sum, act) => sum + act.duration, 0);
  const todayTotalHoursStr = (todayTotalMinutes / 60).toFixed(1);
  const bookingPercentage = Math.min((todayTotalMinutes / 1440) * 100, 100);

  // Helper to resolve category colors
  const getCategoryColor = (catName: string) => {
    switch (catName.toLowerCase()) {
      case 'work':
        return '#6366f1'; // Indigo
      case 'exercise':
        return '#10b981'; // Emerald
      case 'sleep':
        return '#3b82f6'; // Blue
      case 'leisure':
        return '#fbbf24'; // Amber
      case 'social':
        return '#ec4899'; // Pink
      case 'chores':
        return '#6b7280'; // Gray
      case 'health':
        return '#ef4444'; // Red
      case 'education':
        return '#8b5cf6'; // Purple
      default:
        return '#14b8a6'; // Teal
    }
  };

  // Helper to dynamically translate category names
  const getCategoryName = (catName: string) => {
    if (language === 'id') {
      switch (catName.toLowerCase()) {
        case 'work':
          return 'Bekerja';
        case 'exercise':
          return 'Olahraga';
        case 'sleep':
          return 'Tidur';
        case 'leisure':
          return 'Santai';
        case 'social':
          return 'Sosial';
        case 'chores':
          return 'Pekerjaan Rumah';
        case 'health':
          return 'Kesehatan';
        case 'education':
          return 'Pendidikan';
        case 'other':
          return 'Lainnya';
        default:
          return catName;
      }
    }
    return catName;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={theme.colors.tint} />
        }
      >
        {/* Welcome Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{t.hello}</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>{user?.name || 'User'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('ActivityForm')}
          >
            <Plus size={20} color="#ffffff" />
            <Text style={styles.addButtonText}>{t.addBlock}</Text>
          </TouchableOpacity>
        </View>

        {/* 24h Segments Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.cardHeader}>
            <Clock size={20} color={theme.colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t.todayAllocationSegment}</Text>
          </View>

          <View style={styles.statsContainer}>
            <Text style={[styles.statsBig, { color: theme.colors.text }]}>{todayTotalHoursStr} {language === 'id' ? 'jam' : 'hrs'}</Text>
            <Text style={[styles.statsSmall, { color: theme.colors.textSecondary }]}>{t.allocatedOf}</Text>
          </View>

          <View style={[styles.progressBarBackground, { backgroundColor: theme.colors.border }]}>
            <View
              style={[
                styles.progressBarFill,
                { backgroundColor: theme.colors.primary, width: `${bookingPercentage}%` },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
            {bookingPercentage.toFixed(0)}% {t.hoursTracked}
          </Text>
        </View>

        {/* Visual Timeline Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t.todayTimeline}</Text>
        </View>

        {todayActivities.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {t.noActivities}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ActivityForm')}
              style={[styles.emptyButton, { borderColor: theme.colors.primary }]}
            >
              <Text style={[styles.emptyButtonText, { color: theme.colors.primary }]}>{t.bookFirstBlock}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.timelineCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {todayActivities.map((act, index) => {
              const start = new Date(act.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const end = new Date(act.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const color = getCategoryColor(act.category.name);

              return (
                <TouchableOpacity
                   key={act.id}
                  style={[
                    styles.timelineItem,
                    { borderBottomColor: index === todayActivities.length - 1 ? 'transparent' : theme.colors.border },
                  ]}
                  onPress={() => navigation.navigate('ActivityForm', { activityId: act.id })}
                >
                  <View style={[styles.timelineCategoryDot, { backgroundColor: color }]} />
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineItemTitle, { color: theme.colors.text }]}>{act.title}</Text>
                    <Text style={[styles.timelineItemTime, { color: theme.colors.textSecondary }]}>
                      {start} - {end} ({Math.round(act.duration / 60)}h {act.duration % 60}m) | {getCategoryName(act.category.name)}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Weekly Summary Chart */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t.weeklySummary}</Text>
        </View>

        {!summary || summary.categories.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <BarChart3 size={32} color={theme.colors.textSecondary} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
              {t.notEnoughData}
            </Text>
          </View>
        ) : (
          <View style={[styles.chartCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.chartSubtitle, { color: theme.colors.textSecondary }]}>
              {t.totalDuration} {Math.round(summary.totalDurationMinutes / 60)}h {summary.totalDurationMinutes % 60}m
            </Text>

            {summary.categories.map((item) => {
              const color = getCategoryColor(item.name);
              return (
                <View key={item.categoryId} style={styles.chartBarRow}>
                  <View style={styles.chartBarLabelContainer}>
                    <Text style={[styles.chartBarLabel, { color: theme.colors.text }]}>{getCategoryName(item.name)}</Text>
                    <Text style={[styles.chartBarHours, { color: theme.colors.textSecondary }]}>
                      {(item.totalMinutes / 60).toFixed(1)} {language === 'id' ? 'jam' : 'hrs'} ({item.percentage}%)
                    </Text>
                  </View>
                  <View style={[styles.chartBarBackground, { backgroundColor: theme.colors.border }]}>
                    <View style={[styles.chartBarFill, { backgroundColor: color, width: `${item.percentage}%` }]} />
                  </View>
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
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  statsContainer: {
    marginBottom: 16,
  },
  statsBig: {
    fontSize: 32,
    fontWeight: '800',
  },
  statsSmall: {
    fontSize: 13,
    marginTop: 4,
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 14,
    marginBottom: 16,
  },
  emptyButton: {
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emptyButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timelineCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  timelineCategoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 16,
  },
  timelineContent: {
    flex: 1,
  },
  timelineItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  timelineItemTime: {
    fontSize: 13,
  },
  chartCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  chartSubtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  chartBarRow: {
    marginBottom: 16,
  },
  chartBarLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  chartBarLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartBarHours: {
    fontSize: 12,
  },
  chartBarBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  chartBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
