import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { AppHeader } from '../components/AppHeader';
import { PetForm } from '../components/PetForm';

export const onboardingSkipKey = (userId: string) => `onboarding-skipped:${userId}`;

interface PetOnboardingScreenProps {
  userId: string;
  /** Starter card made at sign-up: filled in instead of creating a second pet */
  starterPet?: any;
  onDone: () => void;
}

export function PetOnboardingScreen({ userId, starterPet, onDone }: PetOnboardingScreenProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const skip = async () => {
    await AsyncStorage.setItem(onboardingSkipKey(userId), '1').catch(() => {});
    onDone();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader colors={colors} />
      <PetForm
        ownerId={userId}
        pet={starterPet}
        onSaved={onDone}
        header={
          <View style={styles.intro}>
            <Text style={[styles.title, { color: colors.text }]}>{t('onboarding.title')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('onboarding.subtitle')}</Text>
          </View>
        }
        footer={
          <TouchableOpacity style={styles.skipBtn} onPress={skip}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>{t('onboarding.explore')} →</Text>
          </TouchableOpacity>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  intro: { marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 15, lineHeight: 21 },
  skipBtn: { alignItems: 'center', paddingVertical: 18 },
  skipText: { fontSize: 15, fontWeight: '700' },
});
