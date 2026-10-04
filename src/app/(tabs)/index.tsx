import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, SafeAreaView, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { PetAvatar } from '../../components/PetAvatar';
import * as WebBrowser from 'expo-web-browser';
import { usePetSelector } from '../../context/PetSelectorContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { grrrCareApi } from '../../lib/grrrr-care-api';
import { AppHeader } from '../../components/AppHeader';
import { AnimatedCard } from '../../components/AnimatedCard';
import { HealthBadge, HealthScoreSection } from '../../components/HealthScore';
import { getPetHealthScore, type HealthScoreResult } from '../../lib/health-score';
import { CareSubscription } from '../../components/CareSubscription';
import { CommunityFeed } from '../../components/CommunityFeed';

const STORE_URL = 'https://grrrr-store-89il.vercel.app/';

const LOGOS = {
  grrr: require('../../../assets/logo/grrrr.png'),
  care: require('../../../assets/logo/care.png'),
  vet: require('../../../assets/logo/vet.png'),
  shop: require('../../../assets/logo/shop.png'),
};

export default function HomeScreen() {
  const router = useRouter();
  const { selectedPetId, selectPet } = usePetSelector();
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [pet, setPet] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [health, setHealth] = useState<HealthScoreResult | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPets = async () => {
    if (!user) return;
    try {
      const data = await grrrCareApi.getPets(user.id);
      setPets(data);
      if (data.length === 0) setLoading(false);
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
      setHealth(petData ? await getPetHealthScore(petData).catch(() => null) : null);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reload on focus so pets added or edited in the profile screen show up here
  useFocusEffect(
    useCallback(() => {
      loadPets();
      if (selectedPetId) loadPetData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, selectedPetId])
  );

  if (loading && !pet) {
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
              <View style={{ marginBottom: 6 }}>
                <PetAvatar photoUrl={p.photo_url} species={p.species} size={40} />
              </View>
              <Text style={[styles.petChipText, { color: selectedPetId === p.id ? 'white' : colors.text }]}>
                {p.pet_name}
              </Text>
              {selectedPetId === p.id && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AnimatedCard>

      {/* Hero Card - Pet Profile */}
      {pet && (
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.heroHeader}>
            <TouchableOpacity onPress={() => router.push({ pathname: '/pet/[id]', params: { id: pet.id } })}>
              <PetAvatar photoUrl={pet.photo_url} species={pet.species} size={64} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.petNameBig, { color: colors.text }]}>{pet.pet_name}</Text>
              <Text style={[styles.petBreedBig, { color: colors.textSecondary }]}>
                {pet.breed}
              </Text>
              <Text style={[styles.petDetails, { color: colors.textTertiary }]}>
                {[pet.age != null && (language === 'fr' ? `${pet.age} an${pet.age > 1 ? 's' : ''}` : `${pet.age} year${pet.age === 1 ? '' : 's'}`), pet.weight != null && `${pet.weight} kg`].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <HealthBadge result={health} lang={language} colors={colors} />
          </View>

          {/* Health follow-up score, computed from the pet's records and its species/age profile */}
          <HealthScoreSection result={health} lastVisit={summary?.lastVetVisit ?? null} lang={language} colors={colors} />
        </View>
      )}

      {/* Quick Actions */}
      <AnimatedCard style={styles.actionsSection} delay={200}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('home.quickActions')}</Text>

        <TouchableOpacity
          style={[styles.askCard, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={() => router.push('/(tabs)/chat')}
          activeOpacity={0.85}
        >
          <View style={styles.askIconWrap}>
            <Image source={LOGOS.grrr} style={[styles.askIcon, { tintColor: '#FFFFFF' }]} />
          </View>
          <View style={styles.askText}>
            <Text style={styles.askTitle}>{t('home.askGRRR')}</Text>
            <Text style={styles.askDesc}>{t('home.askGRRRDesc', { pet: pet?.pet_name ?? '' })}</Text>
          </View>
          <Text style={styles.askArrow}>→</Text>
        </TouchableOpacity>

        <View style={styles.tilesRow}>
          {[
            { key: 'health', label: t('home.health'), icon: LOGOS.care, onPress: () => router.push('/(tabs)/health') },
            { key: 'vet', label: t('home.findVet'), icon: LOGOS.vet, onPress: () => router.push('/(tabs)/findvet') },
            { key: 'shop', label: t('home.products'), icon: LOGOS.shop, onPress: () => WebBrowser.openBrowserAsync(STORE_URL), external: true },
          ].map(tile => (
            <TouchableOpacity
              key={tile.key}
              style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={tile.onPress}
              activeOpacity={0.8}
            >
              <View style={[styles.tileIconWrap, { backgroundColor: colors.primary + '14' }]}>
                <Image source={tile.icon} style={[styles.tileIcon, { tintColor: colors.primary }]} />
              </View>
              <Text style={[styles.tileLabel, { color: colors.text }]} numberOfLines={1}>{tile.label}</Text>
              {tile.external && <Text style={[styles.tileExternal, { color: colors.textTertiary }]}>↗</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </AnimatedCard>

      {/* Care+ (payment not open yet: the weekly mission's free month) */}
      <AnimatedCard style={styles.plusSection} delay={250}>
        <CareSubscription />
      </AnimatedCard>

      {/* Guides from the Studio and the community's threads */}
      <CommunityFeed colors={colors} />

      {/* Recent Activity */}
      {summary && (
        <AnimatedCard style={styles.activitySection} delay={300}>
          <View style={styles.activityHeader}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('home.recentActivity')}</Text>
          </View>

          <View style={[styles.activityCard, { backgroundColor: colors.cardSecondary, borderLeftColor: colors.secondary, borderLeftWidth: 4 }]}>
            <Text style={[styles.activityEmoji, { color: colors.secondary }]}>💉</Text>
            <View style={styles.activityContent}>
              <Text style={[styles.activityTitle, { color: colors.text }]}>{language === 'fr' ? 'Vaccins' : 'Vaccinations'}</Text>
              <Text style={[styles.activityValue, { color: colors.textSecondary }]}>{language === 'fr' ? `${summary.vaccinations} enregistré${summary.vaccinations > 1 ? 's' : ''}` : `${summary.vaccinations} on record`}</Text>
            </View>
          </View>

          <View style={[styles.activityCard, { backgroundColor: colors.cardSecondary, borderLeftColor: colors.primary, borderLeftWidth: 4 }]}>
            <Text style={[styles.activityEmoji, { color: colors.primary }]}>💊</Text>
            <View style={styles.activityContent}>
              <Text style={[styles.activityTitle, { color: colors.text }]}>{language === 'fr' ? 'Traitements' : 'Medications'}</Text>
              <Text style={[styles.activityValue, { color: colors.textSecondary }]}>{language === 'fr' ? `${summary.medications} en cours` : `${summary.medications} active`}</Text>
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

  actionsSection: { paddingHorizontal: 20, marginBottom: 28 },
  askCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 22, marginBottom: 12, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
  askIconWrap: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  askIcon: { width: 34, height: 34, resizeMode: 'contain' },
  askText: { flex: 1 },
  askTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  askDesc: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  askArrow: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  tilesRow: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, borderRadius: 18, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tileIconWrap: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  tileIcon: { width: 30, height: 30, resizeMode: 'contain' },
  tileLabel: { fontSize: 13, fontWeight: '700' },
  tileExternal: { position: 'absolute', top: 8, right: 10, fontSize: 12, fontWeight: '700' },

  plusSection: { paddingHorizontal: 20, marginBottom: 28 },

  activitySection: { paddingHorizontal: 20, marginBottom: 20 },
  activityHeader: { marginBottom: 12 },
  activityCard: { paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  activityEmoji: { fontSize: 20 },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  activityValue: { fontSize: 12 },
});
