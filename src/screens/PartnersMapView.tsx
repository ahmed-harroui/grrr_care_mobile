import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '../context/ThemeContext';

interface Partner {
  id: string;
  name: string;
  category: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  address?: string;
  rating: number;
}

interface PartnersMapViewProps {
  partners: Partner[];
  userLocation?: { latitude: number; longitude: number };
  onPartnerPress?: (partner: Partner) => void;
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    clinic: '#FF6B6B',
    pharmacy: '#4ECDC4',
    supplies: '#45B7D1',
    insurance: '#FFA07A',
    grooming: '#98D8C8',
    food: '#F7DC6F',
  };
  return colors[category] || '#888888';
};

export function PartnersMapView({ partners, userLocation, onPartnerPress }: PartnersMapViewProps) {
  const { colors } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    if (isMapReady && userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        },
        1000,
      );
    }
  }, [isMapReady, userLocation]);

  const validPartners = partners.filter(p => p.latitude && p.longitude);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        onMapReady={() => setIsMapReady(true)}
        initialRegion={
          userLocation
            ? {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              }
            : {
                latitude: 44.8404,
                longitude: -0.5805,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              }
        }
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            title="Your Location"
            pinColor="blue"
          />
        )}

        {/* Partner markers */}
        {validPartners.map(partner => (
          <Marker
            key={partner.id}
            coordinate={{
              latitude: partner.latitude!,
              longitude: partner.longitude!,
            }}
            title={partner.name}
            description={partner.address}
            pinColor={getCategoryColor(partner.category)}
            onPress={() => onPartnerPress?.(partner)}
          />
        ))}
      </MapView>

      {/* Legend */}
      <View style={[styles.legend, { backgroundColor: colors.card }]}>
        <Text style={[styles.legendTitle, { color: colors.text }]}>Legend</Text>
        <View style={styles.legendItems}>
          {Object.entries({
            clinic: '🏥 Clinic',
            pharmacy: '💊 Pharmacy',
            supplies: '🛒 Supplies',
            grooming: '✨ Grooming',
          }).map(([cat, label]) => (
            <View key={cat} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: getCategoryColor(cat) },
                ]}
              />
              <Text style={[styles.legendText, { color: colors.text }]}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Info box */}
      <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          📍 {validPartners.length} partners on map
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  legend: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  legendItems: {
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  infoBox: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
