import React, { useEffect } from 'react';
import { useAuthStore } from './src/store/authStore';
import { useSettingsStore } from './src/store/settingsStore';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isDark = useSettingsStore((state) => state.isDark);
  const loadLocalPreferences = useSettingsStore((state) => state.loadLocalPreferences);

  // 1. Recover JWT session and preferences on launch
  useEffect(() => {
    const initializeApp = async () => {
      await checkAuth();
      loadLocalPreferences();
    };

    initializeApp();
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}
