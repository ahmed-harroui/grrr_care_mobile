import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { usePetSelector } from '../../context/PetSelectorContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { grrrCareApi } from '../../lib/grrrr-care-api';
import { AppHeader } from '../../components/AppHeader';
import { AnimatedCard } from '../../components/AnimatedCard';

export default function HomeScreen() {
  const router = useRouter();
  const { selectedPetId, selectPet } = usePetSelector();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [pet, setPet] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPets();
  }, []);

  useEffect(() => {
    if (selectedPetId) loadPetData();
  }, [selectedPetId]);

  const loadPets = async () => {
    try {
      const data = await grrrCareApi.getPets();
      setPets(data);
      if (data.length > 0 && !selectedPetId) {
        selectPet(data[0].id);
      }
    } catch (error) {
      console.error('Error loading pets:', error);
    }
  };

  const loadPetData = async () => {
    try {
      setLoading(true);
      const [petData, healthData] = await Promise.all([
        grrrCareApi.getPetById(selectedPetId!),
        grrrCareApi.getHealthSummary(selectedPetId!),
      ]);
      setPet(petData);
      setSummary(healthData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader colors={colors} />
        <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader colors={colors} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <AnimatedCard style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.greeting, { color: colors.text }]}>{t('home.greeting')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('home.subtitle')}</Text>
      </AnimatedCard>

      {/* Pet Selector */}
      <AnimatedCard style={styles.petSelectorSection} delay={100}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('home.whoAreCaring')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.petScroll}>
          {pets.map(p => (
            <TouchableOpacity
              key={p.id}
              onPress={() => selectPet(p.id)}
              style={[
                styles.petChip,
                {
                  backgroundColor: selectedPetId === p.id ? colors.primary : colors.blush,
                  borderColor: selectedPetId === p.id ? colors.primaryDeep : colors.border,
                  borderWidth: selectedPetId === p.id ? 2 : 1,
                },
              ]}
            >
              <Text style={{ fontSize: 24, marginBottom: 6 }}>🐾</Text>
              <Text style={[styles.petChipText, { color: selectedPetId === p.id ? 'white' : colors.text }]}>
                {p.pet_name}
              </Text>
              {selectedPetId === p.id && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Hero Card - Pet Profile */}
      {pet && (
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={[styles.petNameBig, { color: colors.text }]}>{pet.pet_name}</Text>
              <Text style={[styles.petBreedBig, { color: colors.textSecondary }]}>
                {pet.breed}
              </Text>
              <Text style={[styles.petDetails, { color: colors.textTertiary }]}>
                {pet.age} years · {pet.weight} kg
              </Text>
            </View>
            <View style={[styles.healthBadge, { backgroundColor: colors.success }]}>
              <Text style={styles.healthBadgeText}>●</Text>
              <Text style={styles.healthBadgeLabel}>Healthy</Text>
            </View>
          </View>

          {/* Health Score */}
          <View style={[styles.healthScoreSection, { borderTopColor: colors.border }]}>
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Health Score</Text>
              <Text style={[styles.scoreValue, { color: colors.primary }]}>92%</Text>
            </View>
            <View style={[styles.scoreBar, { backgroundColor: colors.backgroundElement }]}>
              <View
                style={[
                  styles.scoreBarFill,
                  { backgroundColor: colors.secondary, width: '92%' }
                ]}
              />
            </View>
          </View>

          {/* Timeline */}
          <View style={[styles.timelineSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.timelineLabel, { color: colors.textSecondary }]}>LAST CHECK-UP</Text>
            <View style={styles.timelineItems}>
              <View style={[styles.timelineDot, { backgroundColor: colors.secondary }]} />
              <Text style={[styles.timelineDate, { color: colors.text }]}>Mar 15, 2025</Text>
            </View>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <AnimatedCard style={styles.actionsSection} delay={200}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('home.quickActions')}</Text>

        <View style={styles.actionsGrid}>
          {/* Ask GRRR - Pink */}
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/chat')}
          >
            <Text style={styles.actionEmoji}>💬</Text>
            <Text style={styles.actionTitle}>Ask GRRR</Text>
            <Text style={styles.actionDesc}>Ask anything about {pet?.pet_name}</Text>
          </TouchableOpacity>

          {/* Health - Mint */}
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.secondary }]}
            onPress={() => router.push('/(tabs)/health')}
          >
            <Text style={styles.actionEmoji}>❤️</Text>
            <Text style={styles.actionTitle}>Health</Text>
            <Text style={styles.actionDesc}>View medical records</Text>
          </TouchableOpacity>

          {/* Find Vet - Lavender */}
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.lavender }]}>
            <Text style={styles.actionEmoji}>📍</Text>
            <Text style={[styles.actionTitle, { color: colors.text }]}>Find Vet</Text>
            <Text style={[styles.actionDesc, { color: colors.text }]}>Nearby clinics</Text>
          </TouchableOpacity>

          {/* Products - Peach */}
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.peach }]}>
            <Text style={styles.actionEmoji}>🛒</Text>
            <Text style={[styles.actionTitle, { color: colors.text }]}>Products</Text>
            <Text style={[styles.actionDesc, { color: colors.text }]}>Pet supplies</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Activity */}
      {summary && (
        <AnimatedCard style={styles.activitySection} delay={300}>
          <View style={styles.activityHeader}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('home.recentActivity')}</Text>
          </View>

          <View style={[styles.activityCard, { backgroundColor: colors.cardSecondary, borderLeftColor: colors.secondary, borderLeftWidth: 4 }]}>
            <Text style={[styles.activityEmoji, { color: colors.secondary }]}>💉</Text>
            <View style={styles.activityContent}>
              <Text style={[styles.activityTitle, { color: colors.text }]}>Vaccinations</Text>
              <Text style={[styles.activityValue, { color: colors.textSecondary }]}>{summary.vaccinations} on record</Text>
            </View>
          </View>

          <View style={[styles.activityCard, { backgroundColor: colors.cardSecondary, borderLeftColor: colors.primary, borderLeftWidth: 4 }]}>
            <Text style={[styles.activityEmoji, { color: colors.primary }]}>💊</Text>
            <View style={styles.activityContent}>
              <Text style={[styles.activityTitle, { color: colors.text }]}>Medications</Text>
              <Text style={[styles.activityValue, { color: colors.textSecondary }]}>{summary.medications} active</Text>
            </View>
          </View>
        </AnimatedCard>
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 },
  greeting: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 16, fontWeight: '500' },

  petSelectorSection: { paddingHorizontal: 20, marginBottom: 28 },
  sectionLabel: { fontSize: 12, fontWeight: '700', marginBottom: 12, letterSpacing: 0.5 },
  petScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  petChip: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 20, marginRight: 10, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  petChipText: { fontSize: 13, fontWeight: '600' },
  checkmark: { position: 'absolute', top: -4, right: -4, fontSize: 16, color: 'white', fontWeight: '700' },

  heroCard: { marginHorizontal: 20, paddingVertical: 20, paddingHorizontal: 20, borderRadius: 20, marginBottom: 28, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  petNameBig: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  petBreedBig: { fontSize: 14, marginBottom: 2 },
  petDetails: { fontSize: 12 },
  healthBadge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  healthBadgeText: { fontSize: 12, color: 'white', fontWeight: '700' },
  healthBadgeLabel: { fontSize: 12, color: 'white', fontWeight: '600' },

  healthScoreSection: { borderTopWidth: 1, paddingTop: 16, marginBottom: 16 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  scoreLabel: { fontSize: 12, fontWeight: '600' },
  scoreValue: { fontSize: 18, fontWeight: '700' },
  scoreBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 3 },

  timelineSection: { borderTopWidth: 1, paddingTop: 12 },
  timelineLabel: { fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 },
  timelineItems: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineDate: { fontSize: 13, fontWeight: '500' },

  actionsSection: { paddingHorizontal: 20, marginBottom: 28 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: '48%', paddingVertical: 18, paddingHorizontal: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  actionEmoji: { fontSize: 28, marginBottom: 8 },
  actionTitle: { fontSize: 13, fontWeight: '700', color: 'white', textAlign: 'center', marginBottom: 2 },
  actionDesc: { fontSize: 11, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },

  activitySection: { paddingHorizontal: 20, marginBottom: 20 },
  activityHeader: { marginBottom: 12 },
  activityCard: { paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  activityEmoji: { fontSize: 20 },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  activityValue: { fontSize: 12 },
});
