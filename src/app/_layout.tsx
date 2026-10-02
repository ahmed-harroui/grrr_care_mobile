import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PetSelectorProvider } from '@/context/PetSelectorContext';
import { ThemeProvider as GRRRThemeProvider, useTheme } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import LoginScreen from '@/screens/LoginScreen';
import { PetOnboardingScreen, onboardingSkipKey } from '@/screens/PetOnboardingScreen';
import { grrrCareApi } from '@/lib/grrrr-care-api';
import { Colors } from '@/constants/theme';
import { useCareBackground } from '@/hooks/use-care-background';
import { OpeningAnimation } from '@/components/OpeningAnimation';

SplashScreen.preventAutoHideAsync();

// Reminders and home-screen widgets for the signed-in account.
function CareBackground({ userId }: { userId: string }) {
  useCareBackground(userId);
  return null;
}

// Accounts that already have pets (e.g. from the GRRRR app) go straight in; new ones get the pet setup unless they skipped it
function SignedInApp({ userId }: { userId: string }) {
  const { colors } = useTheme();
  const [status, setStatus] = useState<'checking' | 'onboarding' | 'ready'>('checking');

  useEffect(() => {
    let active = true;
    (async () => {
      const skipped = await AsyncStorage.getItem(onboardingSkipKey(userId)).catch(() => null);
      const pets = skipped ? null : await grrrCareApi.getPets(userId).catch(() => null);
      if (active) setStatus(pets && pets.length === 0 ? 'onboarding' : 'ready');
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  if (status === 'checking') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (status === 'onboarding') {
    return <PetOnboardingScreen userId={userId} onDone={() => setStatus('ready')} />;
  }

  return (
    <PetSelectorProvider>
      <CareBackground userId={userId} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="pet/[id]" />
      </Stack>
    </PetSelectorProvider>
  );
}

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth();

  if (loading) {
    const palette = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.background }}>
        <ActivityIndicator color={palette.primary} size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <GRRRThemeProvider>
        <LanguageProvider>
          {!user ? <LoginScreen /> : <SignedInApp key={user.id} userId={user.id} />}
        </LanguageProvider>
      </GRRRThemeProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // The native splash stays up until told otherwise: the opening animation hides it as soon as it
  // is drawn (same picture, so no jump); this is the safety net, or a built app never gets past it.
  useEffect(() => {
    const timer = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <AuthProvider>
        <RootLayoutContent />
      </AuthProvider>
      <OpeningAnimation />
    </View>
  );
}
