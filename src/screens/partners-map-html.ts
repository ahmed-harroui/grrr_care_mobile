// Leaflet page of the Find Vet map, shared by the native WebView and the web iframe

export interface Partner {
  id: string;
  name: string;
  category: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  phone?: string;
}

export interface PartnersMapViewProps {
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

const CATEGORY_EMOJI: Record<string, string> = {
  clinic: '🏥',
  pharmacy: '💊',
  supplies: '🛒',
  insurance: '🛡️',
  food: '🥗',
  grooming: '✨',
};

// Bordeaux, where the partners are, when the owner's position is unknown
const DEFAULT_CENTER = { latitude: 44.8404, longitude: -0.5805 };

export function buildMapHtml({ partners, userLocation }: PartnersMapViewProps) {
  const validPartners = partners.filter(p => p.latitude != null && p.longitude != null);

  const center = userLocation ?? DEFAULT_CENTER;

  const markerData = validPartners.map(p => ({
    name: p.name,
    lat: Number(p.latitude),
    lon: Number(p.longitude),
    color: getCategoryColor(p.category),
    emoji: CATEGORY_EMOJI[p.category] ?? '🐾',
    address: p.address || '',
    category: p.category,
  }));
  // Names and addresses come from the public partner form: embedded as JSON with "<" escaped so they
  // can't close the script tag, then only ever shown with textContent
  const data = JSON.stringify({
    partners: markerData,
    user: userLocation ? { lat: userLocation.latitude, lon: userLocation.longitude } : null,
    center: { lat: center.latitude, lon: center.longitude },
  }).replace(/</g, '\\u003c');

  return `
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
        .pin {
          width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
          border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.35);
          display: flex; align-items: center; justify-content: center;
        }
        .pin span { transform: rotate(45deg); font-size: 16px; line-height: 1; }
        .me {
          width: 16px; height: 16px; border-radius: 50%; background: #2563EB;
          border: 3px solid #fff; box-shadow: 0 0 0 6px rgba(37,99,235,.25);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const data = ${data};
        const map = L.map('map').setView([data.center.lat, data.center.lon], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        const line = (className, text) => {
          const div = document.createElement('div');
          div.className = className;
          div.textContent = text;
          return div;
        };

        // Only drawn when the phone gave its position, below the partner pins
        if (data.user) {
          L.marker([data.user.lat, data.user.lon], {
            icon: L.divIcon({ className: '', html: '<div class="me"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }),
            zIndexOffset: -1000,
          }).addTo(map).bindPopup(line('popup-name', '📍 Vous êtes ici'));
        }

        data.partners.forEach(partner => {
          const pin = document.createElement('div');
          pin.className = 'pin';
          pin.style.background = partner.color;
          pin.appendChild(document.createElement('span')).textContent = partner.emoji;

          const popup = document.createElement('div');
          popup.className = 'popup-content';
          popup.append(line('popup-name', partner.name), line('popup-category', partner.category.toUpperCase()));
          if (partner.address) popup.append(line('popup-address', '📍 ' + partner.address));

          L.marker([partner.lat, partner.lon], {
            icon: L.divIcon({ className: '', html: pin, iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30] }),
          }).addTo(map).bindPopup(popup);
        });

        // Frames every partner, and the owner when their position is known
        const points = data.partners.map(p => [p.lat, p.lon]);
        if (data.user) points.push([data.user.lat, data.user.lon]);
        if (points.length > 1) map.fitBounds(points, { padding: [50, 50], maxZoom: 16 });
        else if (points.length === 1) map.setView(points[0], 15);
      </script>
    </body>
    </html>
  `;
}
