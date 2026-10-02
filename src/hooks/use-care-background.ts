import { useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useLanguage } from '@/context/LanguageContext';
import { usePetSelector } from '@/context/PetSelectorContext';
import { supabase } from '@/lib/supabase';
import { onCarePushOpened, registerCarePush, unregisterCarePush } from '@/lib/care-push';
import { buildCareSnapshot, CARE_WIDGET_PET_KEY, widgetPetId } from '@/widgets/care-snapshot';
import { pushCareWidgets } from '@/widgets/care-widget-task';

const ROUTES: Record<string, string> = { health: '/health', chat: '/chat', pet: '/pets', pets: '/pets' };

// Signed in: registers the phone for reminders, opens the right screen when one is tapped,
// and keeps the home-screen widgets in step with the pet followed (the one selected).
export function useCareBackground(userId: string) {
  const { language } = useLanguage();
  const { selectedPetId, selectPet } = usePetSelector();
  const lang = language === 'fr' ? 'fr' : 'en';

  // Push: registered with the app's language (reminders are written in it).
  useEffect(() => {
    let token: string | null = null;
    let active = true;
    registerCarePush(lang).then((value) => {
      if (active) token = value;
    });
    return () => {
      active = false;
      // Signed out: the phone stops receiving this account's reminders.
      if (token) void supabase.auth.getSession().then(({ data }) => {
        if (!data.session) void unregisterCarePush(token!);
      });
    };
  }, [lang, userId]);

  // A tapped reminder: its pet, then its screen (selectPet is a state setter: stable).
  useEffect(() => onCarePushOpened((data) => {
    if (data.petId) selectPet(data.petId);
    router.push((ROUTES[data.screen ?? 'health'] ?? '/health') as never);
  }), [selectPet]);

  // Widgets: the selected pet, refreshed now, when coming back to the app, and on changes.
  useEffect(() => {
    let active = true;
    const sync = async () => {
      if (selectedPetId) await AsyncStorage.setItem(CARE_WIDGET_PET_KEY, selectedPetId).catch(() => {});
      const petId = selectedPetId ?? (await widgetPetId(userId));
      if (!petId || !active) return;
      const snapshot = await buildCareSnapshot(petId, lang).catch(() => null);
      if (active && snapshot) await pushCareWidgets(snapshot).catch((error) => console.warn('Care widgets not updated', error));
    };
    void sync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
      // Leaving the app: what was just added (a vaccine, a visit) shows on the home screen.
      if (state === 'background') void sync();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [lang, selectedPetId, userId]);

  // Signed out: the widgets go back to their empty state.
  useEffect(() => () => {
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) void pushCareWidgets(null).catch(() => {});
    });
  }, [userId]);
}
