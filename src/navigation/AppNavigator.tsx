import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { getTheme } from '../theme/theme';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CalendarScreen from '../screens/CalendarScreen';
import NotesScreen from '../screens/NotesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ActivityFormScreen from '../screens/ActivityFormScreen';
import EventDetailScreen from '../screens/EventDetailScreen';

// Icons
import { LayoutDashboard, Calendar, ClipboardList, Settings } from 'lucide-react-native';

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  ActivityForm: { activityId?: string; defaultStartTime?: string } | undefined;
  EventDetail: { eventId: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  Calendar: undefined;
  Notes: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

import { translations } from '../services/i18n';

function TabNavigator() {
  const isDark = useSettingsStore((state) => state.isDark);
  const language = useSettingsStore((state) => state.language);
  const theme = getTheme(isDark);
  const t = translations[language];

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Dashboard') {
            return <LayoutDashboard size={size} color={color} />;
          } else if (route.name === 'Calendar') {
            return <Calendar size={size} color={color} />;
          } else if (route.name === 'Notes') {
            return <ClipboardList size={size} color={color} />;
          } else {
            return <Settings size={size} color={color} />;
          }
        },
        tabBarActiveTintColor: theme.colors.tint,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: theme.colors.card,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerTitleStyle: {
          color: theme.colors.text,
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: t.dashboard }} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: t.viewCalendar }} />
      <Tab.Screen name="Notes" component={NotesScreen} options={{ title: t.notes }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: t.settings }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isDark = useSettingsStore((state) => state.isDark);
  const language = useSettingsStore((state) => state.language);
  const theme = getTheme(isDark);
  const t = translations[language];

  const navigationTheme = {
    dark: isDark,
    colors: {
      primary: theme.colors.tint,
      background: theme.colors.background,
      card: theme.colors.card,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.accent,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen
              name="ActivityForm"
              component={ActivityFormScreen}
              options={{
                presentation: 'modal',
                headerShown: true,
                title: 'Activity details',
                headerStyle: { backgroundColor: theme.colors.card },
                headerTintColor: theme.colors.text,
              }}
            />
            <Stack.Screen
              name="EventDetail"
              component={EventDetailScreen}
              options={{
                presentation: 'card',
                headerShown: true,
                title: 'Calendar Event',
                headerStyle: { backgroundColor: theme.colors.card },
                headerTintColor: theme.colors.text,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
