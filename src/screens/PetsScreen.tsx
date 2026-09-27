import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { usePetSelector } from '../context/PetSelectorContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { grrrCareApi } from '../lib/grrrr-care-api';
import { AppHeader } from '../components/AppHeader';

export function PetsScreen() {
  const { selectedPetId, selectPet } = usePetSelector();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPets();
  }, []);

  const loadPets = async () => {
    try {
      setLoading(true);
      const petsData = await grrrCareApi.getPets();
      setPets(petsData);
      if (petsData.length > 0 && !selectedPetId) {
        selectPet(petsData[0].id);
      }
    } catch (error) {
      console.error('Error loading pets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPetEmoji = (species?: string) => {
    if (!species) return '🐾';
    const s = species.toLowerCase();
    if (s.includes('dog')) return '🐕';
    if (s.includes('cat')) return '🐱';
    if (s.includes('rabbit')) return '🐰';
    if (s.includes('bird')) return '🦅';
    if (s.includes('fish')) return '🐠';
    if (s.includes('hamster')) return '🐹';
    return '🐾';
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader colors={colors} />
        <View style={[styles.centerContainer]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (pets.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader colors={colors} />
        <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContent}>
          <Text style={styles.emptyEmoji}>🐾</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No pets added yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Start by adding your first furry friend to get personalized health insights
          </Text>
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]}>
          <Text style={styles.addButtonText}>+ Add Your First Pet</Text>
        </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader colors={colors} />
      <ScrollView showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>Your Companions</Text>
          <Text style={[styles.title, { color: colors.text }]}>My Pets</Text>
        </View>
        <View style={[styles.petCountBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.petCount}>{pets.length}</Text>
        </View>
      </View>

      {/* Selected Pet Hero Card */}
      {selectedPetId && pets.find(p => p.id === selectedPetId) && (
        <View style={styles.heroSection}>
          <View style={[styles.heroBg, { backgroundColor: colors.secondary + '20' }]} />
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.heroCardTop}>
              <View style={styles.heroImageContainer}>
                <Text style={styles.heroEmoji}>{getPetEmoji(pets.find(p => p.id === selectedPetId)?.species)}</Text>
              </View>
              <View style={styles.heroInfo}>
                <Text style={[styles.heroName, { color: colors.text }]}>
                  {pets.find(p => p.id === selectedPetId)?.pet_name}
                </Text>
                <Text style={[styles.heroBreed, { color: colors.textSecondary }]}>
                  {pets.find(p => p.id === selectedPetId)?.breed || 'Lovely pet'}
                </Text>
              </View>
              <View style={[styles.heroStatus, { backgroundColor: colors.secondary }]}>
                <Text style={styles.heroStatusDot}>●</Text>
              </View>
            </View>

            {/* Quick Stats */}
            <View style={[styles.heroStats, { borderTopColor: colors.border }]}>
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatValue, { color: colors.text }]}>
                  {pets.find(p => p.id === selectedPetId)?.age || '—'}
                </Text>
                <Text style={[styles.heroStatLabel, { color: colors.textSecondary }]}>years old</Text>
              </View>
              <View style={[styles.heroStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatValue, { color: colors.text }]}>
                  {pets.find(p => p.id === selectedPetId)?.weight || '—'} kg
                </Text>
                <Text style={[styles.heroStatLabel, { color: colors.textSecondary }]}>weight</Text>
              </View>
              <View style={[styles.heroStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatValue, { color: colors.text }]}>
                  {pets.find(p => p.id === selectedPetId)?.species || '—'}
                </Text>
                <Text style={[styles.heroStatLabel, { color: colors.textSecondary }]}>species</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Other Pets Section */}
      {pets.length > 1 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>OTHER PETS</Text>

          <View style={styles.petsGrid}>
            {pets.filter(p => p.id !== selectedPetId).map(pet => (
              <TouchableOpacity
                key={pet.id}
                style={[
                  styles.petCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => selectPet(pet.id)}
              >
                {/* Large Pet Emoji */}
                <View style={[styles.petImageContainer, { backgroundColor: colors.backgroundElement }]}>
                  <Text style={styles.petEmoji}>{getPetEmoji(pet.species)}</Text>
                </View>

                {/* Pet Info */}
                <View style={styles.petContent}>
                  <Text style={[styles.petName, { color: colors.text }]} numberOfLines={1}>
                    {pet.pet_name}
                  </Text>
                  <Text style={[styles.petBreed, { color: colors.textSecondary }]} numberOfLines={1}>
                    {pet.breed || pet.species || 'Pet'}
                  </Text>

                  {/* Mini Stats */}
                  <View style={styles.petStats}>
                    <View style={styles.petStat}>
                      <Text style={[styles.petStatValue, { color: colors.text }]}>
                        {pet.age || '—'}
                      </Text>
                      <Text style={[styles.petStatLabel, { color: colors.textTertiary }]}>y</Text>
                    </View>
                    <View style={[styles.petStatSep, { backgroundColor: colors.border }]} />
                    <View style={styles.petStat}>
                      <Text style={[styles.petStatValue, { color: colors.text }]}>
                        {pet.weight || '—'} kg
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Arrow */}
                <Text style={styles.petArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Add New Pet */}
      <TouchableOpacity
        style={[styles.addNewPetCard, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.addNewPetEmoji}>+</Text>
        <Text style={styles.addNewPetText}>Add Another Pet</Text>
      </TouchableOpacity>

      {/* Tips Section */}
      <View style={[styles.tipsSection, { backgroundColor: colors.backgroundElement }]}>
        <Text style={styles.tipsEmoji}>💡</Text>
        <View style={styles.tipsContent}>
          <Text style={[styles.tipsTitle, { color: colors.text }]}>Pet Care Tips</Text>
          <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
            Keep health records up to date and track medications regularly
          </Text>
        </View>
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  emptyContent: { alignItems: 'center', marginBottom: 40 },
  emptyEmoji: { fontSize: 80, marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
  addButton: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, alignItems: 'center' },
  addButtonText: { color: 'white', fontWeight: '700', fontSize: 14 },

  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  title: { fontSize: 32, fontWeight: '800' },
  petCountBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  petCount: { color: 'white', fontWeight: '700', fontSize: 16 },

  heroSection: { paddingHorizontal: 20, marginBottom: 32, position: 'relative' },
  heroBg: { position: 'absolute', top: 0, left: 20, right: 20, height: 200, borderRadius: 20, zIndex: 0 },
  heroCard: { paddingVertical: 20, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, zIndex: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  heroCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  heroImageContainer: { width: 70, height: 70, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  heroEmoji: { fontSize: 40 },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  heroBreed: { fontSize: 13 },
  heroStatus: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  heroStatusDot: { color: 'white', fontSize: 16, fontWeight: '700' },

  heroStats: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 12, gap: 0 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  heroStatLabel: { fontSize: 11, fontWeight: '500' },
  heroStatDivider: { width: 1, height: 40 },

  sectionTitle: { paddingHorizontal: 20, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12 },

  petsGrid: { paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  petCard: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },

  petImageContainer: { width: 54, height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  petEmoji: { fontSize: 28 },

  petContent: { flex: 1 },
  petName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  petBreed: { fontSize: 12, marginBottom: 6 },

  petStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  petStat: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  petStatValue: { fontSize: 11, fontWeight: '700' },
  petStatLabel: { fontSize: 9, fontWeight: '500' },
  petStatSep: { width: 1, height: 12 },

  petArrow: { fontSize: 20, color: '#ccc', fontWeight: '300' },

  addNewPetCard: { marginHorizontal: 20, marginBottom: 20, paddingVertical: 20, paddingHorizontal: 20, borderRadius: 16, alignItems: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 3 },
  addNewPetEmoji: { fontSize: 32, color: 'white', fontWeight: '700' },
  addNewPetText: { fontSize: 16, fontWeight: '700', color: 'white' },

  tipsSection: { marginHorizontal: 20, marginBottom: 28, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  tipsEmoji: { fontSize: 24 },
  tipsContent: { flex: 1 },
  tipsTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  tipsText: { fontSize: 12, lineHeight: 16 },
});
