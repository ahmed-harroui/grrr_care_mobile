import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface Partner {
  id: string;
  name: string;
  category: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  phone?: string;
}

interface PartnersMapViewProps {
  partners: Partner[];
  userLocation?: { latitude: number; longitude: number; city?: string };
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

export function PartnersMapView({ partners, userLocation }: PartnersMapViewProps) {
  const validPartners = partners.filter(p => p.latitude && p.longitude);

  const centerLat = userLocation?.latitude || 44.8404;
  const centerLon = userLocation?.longitude || -0.5805;

  const markerData = validPartners.map(p => ({
    name: p.name,
    lat: p.latitude,
    lon: p.longitude,
    color: getCategoryColor(p.category),
    address: p.address || '',
    category: p.category,
  }));

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
      <style>
        * { margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; }
        #map { width: 100%; height: 100%; }
        .popup-content {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
          font-size: 12px;
          min-width: 150px;
        }
        .popup-name { font-weight: 600; margin-bottom: 4px; }
        .popup-category { color: #666; font-size: 11px; }
        .popup-address { color: #888; font-size: 11px; margin-top: 4px; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map').setView([${centerLat}, ${centerLon}], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        // User location marker
        L.circleMarker([${centerLat}, ${centerLon}], {
          radius: 8,
          fillColor: '#4A90E2',
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(map).bindPopup('📍 Your Location');

        // Partner markers
        const partners = ${JSON.stringify(markerData)};
        partners.forEach(partner => {
          const popupContent = \`
            <div class="popup-content">
              <div class="popup-name">\${partner.name}</div>
              <div class="popup-category">\${partner.category.toUpperCase()}</div>
              \${partner.address ? '<div class="popup-address">📍 ' + partner.address + '</div>' : ''}
            </div>
          \`;

          L.circleMarker([partner.lat, partner.lon], {
            radius: 10,
            fillColor: partner.color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          }).addTo(map).bindPopup(popupContent);
        });

        // Auto fit bounds if partners exist
        if (partners.length > 0) {
          const lats = [${centerLat}, ...partners.map(p => p.lat)];
          const lons = [${centerLon}, ...partners.map(p => p.lon)];
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLon = Math.min(...lons);
          const maxLon = Math.max(...lons);

          map.fitBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [50, 50] });
        }
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        scalesPageToFit={true}
        scrollEnabled={true}
        zoomEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
