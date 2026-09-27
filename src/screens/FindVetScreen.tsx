import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import { useTheme } from '../context/ThemeContext';
import { grrrCareApi } from '../lib/grrrr-care-api';

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
  rating: number;
  services?: any;
  distance?: number;
}

export function FindVetScreen() {
  const { colors } = useTheme();
  const [featured, setFeatured] = useState<Partner | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; city?: string } | null>(null);

  const calculateDistance = (lat1: number, lon1: number, lat2?: number, lon2?: number): number | undefined => {
    if (!lat2 || !lon2) return undefined;

    const R = 3959;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  const loadPartners = async () => {
    try {
      setLoading(true);
      const [featuredData, allPartners] = await Promise.all([
        grrrCareApi.getFeaturedPartner(),
        grrrCareApi.getAllPartners(),
      ]);

      console.log('Featured:', featuredData?.name, 'Partners:', allPartners.length, 'User location:', userLocation?.city);

      let enhancedPartners = allPartners;
      if (userLocation) {
        enhancedPartners = allPartners
          .map(p => ({
            ...p,
            distance: calculateDistance(userLocation.latitude, userLocation.longitude, p.latitude, p.longitude),
          }))
          .sort((a, b) => {
            if (a.distance && b.distance) return a.distance - b.distance;
            return 0;
          });
      }

      setFeatured(featuredData);
      setPartners(enhancedPartners);
    } catch (error) {
      console.error('Error loading partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        const coords: { latitude: number; longitude: number; city?: string } = {
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
      await loadPartners();
    } catch (error) {
      console.error('Location error:', error);
      await loadPartners();
    }
  };

  useEffect(() => {
    initializeLocation();
  }, []);

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

  const handleViewAllOnMap = () => {
    if (partners.length === 0) {
      Alert.alert('No partners', 'No partners available to view on map');
      return;
    }

    const validPartners = partners.filter(p => p.latitude && p.longitude);
    if (validPartners.length === 0) {
      Alert.alert('No location data', 'Partners do not have location data');
      return;
    }

    const bounds = validPartners.reduce(
      (acc, p) => ({
        minLat: Math.min(acc.minLat, p.latitude!),
        maxLat: Math.max(acc.maxLat, p.latitude!),
        minLon: Math.min(acc.minLon, p.longitude!),
        maxLon: Math.max(acc.maxLon, p.longitude!),
      }),
      {
        minLat: validPartners[0].latitude!,
        maxLat: validPartners[0].latitude!,
        minLon: validPartners[0].longitude!,
        maxLon: validPartners[0].longitude!,
      }
    );

    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    const centerLon = (bounds.minLon + bounds.maxLon) / 2;

    const url = Platform.OS === 'ios'
      ? `maps://maps.apple.com/?ll=${centerLat},${centerLon}&q=pet%20services`
      : `https://www.google.com/maps/search/pet+services/@${centerLat},${centerLon},12z`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open maps');
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={[styles.greeting, { color: colors.text }]}>Find a Partner 🏥</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {userLocation?.city ? `Trusted clinics and services in ${userLocation.city}` : 'Trusted clinics and services for your pet'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: colors.primary }]}
            onPress={handleViewAllOnMap}
          >
            <Text style={styles.toggleBtnText}>🗺️</Text>
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
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ALL PARTNERS</Text>
          <Text style={[styles.partnersSubtitle, { color: colors.textSecondary }]}>Browse all trusted services</Text>

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
                <View style={styles.partnerMeta}>
                  <Text style={[styles.partnerRating, { color: colors.secondary }]}>⭐ {partner.rating}</Text>
                  <Text style={[styles.partnerCategory, { color: colors.textTertiary }]}>{partner.category}</Text>
                </View>
                {partner.distance && (
                  <Text style={[styles.partnerDistance, { color: colors.textSecondary }]}>📍 {partner.distance} mi</Text>
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
          <Text style={[styles.infoTitle, { color: colors.text }]}>Partner Benefits</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            All our partners are vetted and trusted by the GRRR Care community. Get exclusive discounts!
          </Text>
        </View>
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { justifyContent: 'center', alignItems: 'center' },

  header: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  headerText: { flex: 1 },

  toggleBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  toggleBtnText: { fontSize: 16, fontWeight: '600', color: 'white' },
  greeting: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, fontWeight: '500' },

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

  // Info Box
  infoBox: { marginHorizontal: 20, marginBottom: 28, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  infoEmoji: { fontSize: 20 },
  infoTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  infoText: { fontSize: 12, lineHeight: 16 },
});
