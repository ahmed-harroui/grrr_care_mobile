import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

// GRRR Care push notifications: vaccines, vet visits, treatments, birthdays, weekly tips.
// They are written by the database (care_notifications, migration 016) and sent by the shared
// send-push Edge Function to the phones registered here with app = 'care' (never GRRRR's).

// Expo Go has no remote push since SDK 53 (it only warns): push only in the real app (EAS builds).
const isExpoGo = Constants.executionEnvironment === 'storeClient';
const isNative = (Platform.OS === 'ios' || Platform.OS === 'android') && !isExpoGo;
type Language = 'en' | 'fr';
const pick = (language: Language, en: string, fr: string) => (language === 'fr' ? fr : en);

// Care has no notification list of its own: a reminder also shows while the app is open.
if (isNative) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

// One Android channel per kind of reminder (send-push picks it from the reminder's data).
async function setUpChannels(language: Language) {
  if (Platform.OS !== 'android') return;
  const channel = (id: string, en: string, fr: string, importance: Notifications.AndroidImportance) =>
    Notifications.setNotificationChannelAsync(id, { name: pick(language, en, fr), importance, lightColor: '#2563EB', vibrationPattern: [0, 150, 100, 150], showBadge: true });
  await Promise.all([
    channel('medications', 'Treatments', 'Traitements', Notifications.AndroidImportance.HIGH),
    channel('appointments', 'Vet visits', 'Rendez-vous vétérinaire', Notifications.AndroidImportance.HIGH),
    channel('vaccines', 'Vaccines', 'Vaccins', Notifications.AndroidImportance.DEFAULT),
    channel('health', 'Health and tips', 'Santé et conseils', Notifications.AndroidImportance.LOW),
  ]);
}

/** Asks the permission and registers this phone for the signed-in account (Care phones only). */
export async function registerCarePush(language: Language): Promise<string | null> {
  if (!isNative || !Device.isDevice) return null;
  try {
    await setUpChannels(language);
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    const { error } = await supabase.rpc('register_push_token', { p_token: token, p_platform: Platform.OS, p_language: language, p_prefs: {}, p_app: 'care' });
    if (error) console.warn('Care push token not saved', error.message);
    return token;
  } catch (error) {
    console.warn('Care push not available', error);
    return null;
  }
}

/** At sign-out: this phone stops receiving the account's reminders. */
export async function unregisterCarePush(token: string) {
  const { error } = await supabase.rpc('unregister_push_token', { p_token: token });
  if (error) console.warn('Care push token not removed', error.message);
}

/** Calls onOpen with the reminder the user tapped (also the one that launched the app). */
export function onCarePushOpened(onOpen: (data: { petId?: string; screen?: string; type?: string }) => void) {
  if (!isNative) return () => {};
  let active = true;
  Notifications.getLastNotificationResponseAsync()
    .then((response) => active && response && onOpen(response.notification.request.content.data ?? {}))
    .catch(() => {});
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => onOpen(response.notification.request.content.data ?? {}));
  return () => {
    active = false;
    subscription.remove();
  };
}
