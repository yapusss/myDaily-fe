import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token = null;

  if (Platform.OS === 'web') {
    return null;
  }

  // 1. Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // 2. Request permission if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // 3. Exit if denied
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }

  // 4. Retrieve token from OS
  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    token = tokenData.data;

    // For Android, set channel importance
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366f1',
      });
    }
  } catch (e) {
    console.warn('Error fetching device push token:', e);
    // Return dummy token for emulator testing if it fails
    token = 'simulated-emulator-token-' + Platform.OS + '-' + Math.round(Math.random() * 100000);
  }

  return token;
}

export async function sendTokenToBackend(token: string): Promise<boolean> {
  try {
    await api.post('/device-tokens', { token });
    console.log('Successfully registered device token on backend:', token);
    return true;
  } catch (error) {
    console.warn('Failed to register device token on backend:', error);
    return false;
  }
}
