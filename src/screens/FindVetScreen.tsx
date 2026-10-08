import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert, Platform, SafeAreaView, RefreshControl } from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { grrrCareApi } from '../lib/grrrr-care-api';
import { PartnersMapView } from './PartnersMapView';
import { AppHeader } from '../components/AppHeader';

interface Partner {
  id: string;
  name: string;
  category: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  rating: number | null;
  services?: any;
  /** In km, from the owner's position */
  distance?: number;
  /** Said yes to GRRR Care (form or invitation); the others are plain listings from OpenStreetMap */
  is_partner?: boolean;
  /** Offered to GRRR members by a partner */
  discount_percent?: number | null;
}

export function FindVetScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const tx = (en: string, fr: string) => (language === 'fr' ? fr : en);
  const [featured, setFeatured] = useState<Partner | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; city?: string } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // The location is passed in: the state set just before isn't visible yet in this call
  const loadPartners = async (location: typeof userLocation, { quiet = false } = {}) => {
    try {
      if (!quiet) setLoading(true);
      // With a position the server returns the places around it, nearest first, with their distance
      const [featuredData, nearby] = await Promise.all([
        grrrCareApi.getFeaturedPartner(),
        grrrCareApi.getAllPartners(location),
      ]);

      setFeatured(featuredData);
      setPartners(nearby.map((p: any) => ({ ...p, distance: p.distance_km == null ? undefined : Math.round(p.distance_km * 10) / 10 })));
    } catch (error) {
      console.error('Error loading partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeLocation = async () => {
    let coords: { latitude: number; longitude: number; city?: string } | null = null;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        try {
          const addresses = await Location.reverseGeocodeAsync(coords);
          if (addresses.length > 0) {
            coords.city = addresses[0].city || addresses[0].region || 'Your Area';
          }
        } catch (err) {
          console.warn('Geocoding error:', err);
        }

        setUserLocation(coords);
      }
    } catch (error) {
      console.error('Location error:', error);
    }
    await loadPartners(coords);
  };

  useEffect(() => {
    initializeLocation();
  }, []);

  // Tabs stay mounted: reload when the tab is shown again, so newly published partners appear
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      loadPartners(userLocation, { quiet: true });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userLocation])
  );

  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    await loadPartners(userLocation, { quiet: true });
    setRefreshing(false);
  };

  const handleCall = (phone?: string) => {
    if (!phone) {
      Alert.alert('No phone number', 'This partner does not have a phone number available.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'Could not open phone dialer');
    });
  };

  const handleOpenMap = (name: string, latitude?: number, longitude?: number, address?: string) => {
    if (!latitude || !longitude) {
      Alert.alert('No location', 'Location data not available for this partner.');
      return;
    }

    const label = encodeURIComponent(name);
    const query = encodeURIComponent(address || `${latitude},${longitude}`);

    const url = Platform.OS === 'ios'
      ? `maps://maps.apple.com/?address=${label}&ll=${latitude},${longitude}&q=${label}`
      : `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open maps');
    });
  };

  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      clinic: '🏥',
      pharmacy: '💊',
      supplies: '🛒',
      insurance: '🛡️',
      food: '🥗',
      grooming: '✨',
    };
    return emojis[category] || '🐾';
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, styles.centerContent]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // Map view
  if (viewMode === 'map') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader colors={colors} />
        <View style={[styles.mapHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: colors.primary }]}
            onPress={() => setViewMode('list')}
          >
            <Text style={styles.toggleBtnText}>📋 List</Text>
          </TouchableOpacity>
          <Text style={[styles.mapTitle, { color: colors.text }]}>
            {partners.filter(p => p.latitude && p.longitude).length} {tx('places', 'établissements')}
          </Text>
        </View>
        <PartnersMapView partners={partners} userLocation={userLocation || undefined} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader colors={colors} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <Text style={[styles.greeting, { color: colors.text }]}>{tx('Around you', 'Autour de toi')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {userLocation?.city ? `📍 ${userLocation.city}` : tx('🐾 Vets, pet shops and groomers', '🐾 Vétérinaires, animaleries et toiletteurs')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.mapBtn, { backgroundColor: colors.primary }]}
            onPress={() => setViewMode('map')}
            activeOpacity={0.7}
          >
            <Text style={styles.mapBtnText}>🗺️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Featured Partner */}
      {featured && (
        <View style={styles.featuredSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>🌟 FEATURED PARTNER</Text>
          <TouchableOpacity
            style={[styles.featuredCard, { backgroundColor: colors.card, borderColor: colors.primary, shadowColor: colors.primary }]}
          >
            <View style={[styles.featuredBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.featuredBadgeText}>⭐ Featured</Text>
            </View>

            <View style={styles.featuredTop}>
              <View style={[styles.categoryBadge, { backgroundColor: colors.secondary }]}>
                <Text style={styles.categoryEmoji}>{getCategoryEmoji(featured.category)}</Text>
              </View>
              <View style={styles.featuredInfo}>
                <Text style={[styles.featuredName, { color: colors.text }]}>{featured.name}</Text>
                <Text style={[styles.featuredCategory, { color: colors.textSecondary }]}>{featured.category.toUpperCase()}</Text>
              </View>
              <View style={[styles.ratingBadge, { backgroundColor: colors.secondary }]}>
                <Text style={styles.ratingText}>{featured.rating}</Text>
              </View>
            </View>

            {featured.description && (
              <Text style={[styles.featuredDesc, { color: colors.textSecondary }]}>{featured.description}</Text>
            )}

            <View style={[styles.featuredDetails, { borderTopColor: colors.border }]}>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📍</Text>
                <Text style={[styles.detailText, { color: colors.text }]}>{featured.address}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📞</Text>
                <Text style={[styles.detailText, { color: colors.text }]}>{featured.phone}</Text>
              </View>
              {featured.website && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>🌐</Text>
                  <Text style={[styles.detailText, { color: colors.text }]}>{featured.website}</Text>
                </View>
              )}
            </View>

            <View style={styles.featuredActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleCall(featured.phone)}
              >
                <Text style={styles.actionBtnText}>📞 Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
                onPress={() => handleOpenMap(featured.name, featured.latitude, featured.longitude, featured.address)}
              >
                <Text style={styles.actionBtnText}>🗺️ Map</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* All Partners */}
      {partners.length > 0 && (
        <View style={styles.partnersSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {userLocation ? tx('NEAR YOU', 'PRÈS DE CHEZ TOI') : tx('OUR PARTNERS', 'NOS PARTENAIRES')}
          </Text>
          <Text style={[styles.partnersSubtitle, { color: colors.textSecondary }]}>
            {userLocation ? tx('Nearest first, within 30 km', "Du plus proche au plus loin, jusqu'à 30 km") : tx('Allow location to see the places around you', 'Autorise la localisation pour voir les établissements autour de toi')}
          </Text>

          <View style={styles.partnersGrid}>
            {partners.map(partner => (
              <TouchableOpacity
                key={partner.id}
                style={[styles.partnerCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleOpenMap(partner.name, partner.latitude, partner.longitude, partner.address)}
              >
                <View style={[styles.partnerLogo, { backgroundColor: colors.backgroundElement }]}>
                  <Text style={styles.partnerEmoji}>{getCategoryEmoji(partner.category)}</Text>
                </View>
                <Text style={[styles.partnerName, { color: colors.text }]} numberOfLines={2}>{partner.name}</Text>
                {partner.is_partner && (
                  <View style={[styles.partnerBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.partnerBadgeText}>
                      🤝 {tx('Partner', 'Partenaire')}{partner.discount_percent ? ` · -${partner.discount_percent} %` : ''}
                    </Text>
                  </View>
                )}
                <View style={styles.partnerMeta}>
                  {/* Partners who joined through the form have no rating yet */}
                  {partner.rating != null && (
                    <Text style={[styles.partnerRating, { color: colors.secondary }]}>⭐ {partner.rating}</Text>
                  )}
                  <Text style={[styles.partnerCategory, { color: colors.textTertiary }]}>{partner.category}</Text>
                </View>
                {/* != null: a distance of 0 would render a bare "0" outside <Text> and crash */}
                {partner.distance != null && (
                  <Text style={[styles.partnerDistance, { color: colors.textSecondary }]}>📍 {partner.distance} km</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Info Box */}
      <View style={[styles.infoBox, { backgroundColor: colors.backgroundElement }]}>
        <Text style={styles.infoEmoji}>💡</Text>
        <View>
          <Text style={[styles.infoTitle, { color: colors.text }]}>{tx('GRRR Care partners', 'Partenaires GRRR Care')}</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {tx(
              'Places with the 🤝 badge are partners of GRRR Care; some offer a discount to members: mention GRRR when you visit.',
              'Les établissements avec le badge 🤝 sont partenaires de GRRR Care ; certains offrent une réduction aux membres : dis que tu viens de GRRR.'
            )}
          </Text>
        </View>
      </View>

      <Text style={[styles.attribution, { color: colors.textTertiary }]}>
        {tx('Places © OpenStreetMap contributors', 'Établissements © les contributeurs d’OpenStreetMap')}
      </Text>

      <View style={{ height: 80 }} />
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16
  },
  headerText: { flex: 1 },

  mapHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
  },
  mapTitle: { flex: 1, fontSize: 14, fontWeight: '600' },

  mapBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapBtnText: { fontSize: 24 },

  toggleBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  toggleBtnText: { fontSize: 16, fontWeight: '600', color: 'white' },
  greeting: { fontSize: 32, fontWeight: '800', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontWeight: '500', lineHeight: 20 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 10 },

  // Featured Partner
  featuredSection: { paddingHorizontal: 20, marginBottom: 28 },
  featuredCard: { borderRadius: 18, borderWidth: 2, overflow: 'hidden', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },

  featuredBadge: { paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  featuredBadgeText: { color: 'white', fontSize: 12, fontWeight: '700' },

  featuredTop: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, gap: 12 },
  categoryBadge: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  categoryEmoji: { fontSize: 28 },

  featuredInfo: { flex: 1 },
  featuredName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  featuredCategory: { fontSize: 11, fontWeight: '600' },

  ratingBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  ratingText: { color: 'white', fontSize: 12, fontWeight: '700' },

  featuredDesc: { paddingHorizontal: 16, paddingBottom: 12, fontSize: 13, lineHeight: 18 },

  featuredDetails: { borderTopWidth: 1, paddingVertical: 12, paddingHorizontal: 16, gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailIcon: { fontSize: 16 },
  detailText: { fontSize: 12, flex: 1 },

  featuredActions: { flexDirection: 'row', gap: 10, paddingVertical: 12, paddingHorizontal: 16 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: 'white' },

  // Partners Grid
  partnersSection: { paddingHorizontal: 20, marginBottom: 28 },
  partnersSubtitle: { fontSize: 13, marginBottom: 14, fontWeight: '500' },

  partnersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  partnerCard: { width: '48%', borderRadius: 14, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },

  partnerLogo: { width: 52, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  partnerEmoji: { fontSize: 26 },

  partnerName: { fontSize: 13, fontWeight: '700', marginBottom: 6, textAlign: 'center', lineHeight: 16 },

  partnerMeta: { width: '100%', alignItems: 'center', gap: 2 },
  partnerRating: { fontSize: 11, fontWeight: '600' },
  partnerCategory: { fontSize: 10 },
  partnerDistance: { fontSize: 9, marginTop: 4, fontWeight: '500' },
  partnerBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 6 },
  partnerBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
  attribution: { textAlign: 'center', fontSize: 10, marginBottom: 12 },

  // Info Box
  infoBox: { marginHorizontal: 20, marginBottom: 28, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  infoEmoji: { fontSize: 20 },
  infoTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  infoText: { fontSize: 12, lineHeight: 16 },
});
