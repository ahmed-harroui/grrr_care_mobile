import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, SafeAreaView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { usePetSelector } from '../../context/PetSelectorContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { grrrCareApi } from '../../lib/grrrr-care-api';
import { AppHeader } from '../../components/AppHeader';
import { PetAvatar } from '../../components/PetAvatar';

export default function PetsScreen() {
  const { selectedPetId, selectPet } = usePetSelector();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [pets, setPets] = useState<any[] | null>(null);

  // Reload on focus so edits made in the pet profile show up when coming back
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      grrrCareApi
        .getPets(user.id)
        .then(data => {
          setPets(data);
          if (data.length > 0 && !selectedPetId) selectPet(data[0].id);
        })
        .catch(error => {
          console.error('Error loading pets:', error);
          setPets(current => current ?? []);
        });
    }, [user, selectedPetId, selectPet])
  );

  const openPet = (id: string) => router.push({ pathname: '/pet/[id]', params: { id } });

  if (pets === null) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <AppHeader colors={colors} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader colors={colors} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('pets.myPets')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('pets.yourCompanions')}</Text>
        </View>

        {pets.length === 0 && (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.emptyEmoji}>🐾</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('pets.noPets')}</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('pets.noPetsDesc')}</Text>
          </View>
        )}

        <View style={styles.list}>
          {pets.map(pet => {
            const isActive = selectedPetId === pet.id;
            const details = [
              pet.breed,
              pet.age ? `${pet.age} ${t('pets.yearsOld')}` : null,
              pet.weight ? `${pet.weight} kg` : null,
            ].filter(Boolean);

            return (
              <TouchableOpacity
                key={pet.id}
                onPress={() => openPet(pet.id)}
                activeOpacity={0.85}
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: isActive ? colors.primary : colors.border },
                ]}
              >
                <PetAvatar photoUrl={pet.photo_url} species={pet.species} size={60} />
                <View style={styles.info}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{pet.pet_name}</Text>
                  <Text style={[styles.details, { color: colors.textSecondary }]} numberOfLines={1}>
                    {details.join(' · ') || pet.species}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => selectPet(pet.id)}
                  hitSlop={10}
                  style={[
                    styles.activeDot,
                    { borderColor: colors.primary, backgroundColor: isActive ? colors.primary : 'transparent' },
                  ]}
                >
                  {isActive && <Text style={styles.activeCheck}>✓</Text>}
                </TouchableOpacity>
                <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => openPet('new')}
        >
          <Text style={styles.addButtonText}>
            {pets.length === 0 ? t('pets.addYourFirstPet') : `+ ${t('pets.addAnotherPet')}`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 140 },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, fontWeight: '500' },
  empty: { alignItems: 'center', padding: 24, borderRadius: 18, borderWidth: 1, marginBottom: 20 },
  emptyEmoji: { fontSize: 44, marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  list: { gap: 12, marginBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: '800', marginBottom: 3 },
  details: { fontSize: 13 },
  activeDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  activeCheck: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  chevron: { fontSize: 26, fontWeight: '300', marginLeft: -4 },
  addButton: { paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  addButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
