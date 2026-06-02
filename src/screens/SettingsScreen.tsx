import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { getTheme } from '../theme/theme';
import { translations } from '../services/i18n';
import { User, Shield, Moon, LogOut } from 'lucide-react-native';

export default function SettingsScreen() {
  const authUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const isDark = useSettingsStore((state) => state.isDark);
  const toggleTheme = useSettingsStore((state) => state.toggleTheme);
  const loadLocalPreferences = useSettingsStore((state) => state.loadLocalPreferences);

  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  const theme = getTheme(isDark);
  const t = translations[language];

  useEffect(() => {
    loadLocalPreferences();
  }, []);

  const handleLogout = () => {
    Alert.alert(t.signOut, t.signOutConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.signOut,
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* User Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.cardRow}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '15' }]}>
              <User size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.userMetadata}>
              <Text style={[styles.userName, { color: theme.colors.text }]}>{authUser?.name || 'Daily User'}</Text>
              <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>{authUser?.email || 'user@example.com'}</Text>
            </View>
          </View>
        </View>

        {/* Preferences Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{t.preferences}</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Moon size={20} color={theme.colors.tint} />
              <Text style={[styles.settingText, { color: theme.colors.text }]}>{t.darkMode}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
              thumbColor={isDark ? theme.colors.primary : '#f4f3f4'}
            />
          </View>
          
          <View style={[styles.settingItem, { marginTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12 }]}>
            <View style={styles.settingItemLeft}>
              <Text style={{ fontSize: 20 }}>🇮🇩</Text>
              <Text style={[styles.settingText, { color: theme.colors.text }]}>Bahasa Indonesia</Text>
            </View>
            <Switch
              value={language === 'id'}
              onValueChange={(val) => setLanguage(val ? 'id' : 'en')}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
              thumbColor={language === 'id' ? theme.colors.primary : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Security Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{t.security}</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
            <View style={styles.settingItemLeft}>
              <Shield size={20} color={theme.colors.tint} />
              <Text style={[styles.settingText, { color: theme.colors.text }]}>{t.dataPrivacy}</Text>
            </View>
            <Text style={[styles.settingValueText, { color: theme.colors.success }]}>{t.secured}</Text>
          </View>
        </View>

        {/* Logout Action */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: theme.colors.danger }]}
          onPress={handleLogout}
        >
          <LogOut size={20} color={theme.colors.danger} />
          <Text style={[styles.logoutText, { color: theme.colors.danger }]}>{t.signOut}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userMetadata: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingValueText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  logoutBtn: {
    flexDirection: 'row',
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
