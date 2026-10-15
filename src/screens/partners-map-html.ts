// Leaflet page of the Find Vet map, shared by the native WebView and the web iframe.
// The page is built once; after that the app sends it the places to show (a message), and the page
// tells the app where the map was moved, so the places of the part being looked at are loaded.

export interface Partner {
  id: string;
  name: string;
  category: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  phone?: string;
  is_partner?: boolean;
}

export interface MapArea {
  latitude: number;
  longitude: number;
  /** From the centre to a corner of the map, in km */
  km: number;
}

export interface PartnersMapViewProps {
  partners: Partner[];
  userLocation?: { latitude: number; longitude: number; city?: string };
  /** The map was moved or zoomed: the area now looked at */
  onMove?: (area: MapArea) => void;
}

// Bordeaux, where the partners are, when the owner's position is unknown
const DEFAULT_CENTER = { latitude: 44.8404, longitude: -0.5805 };

/** What the page needs of a place: no more (it travels in a message each time the places change). */
export function mapPlaces(partners: Partner[]) {
  return partners
    .filter(p => p.latitude != null && p.longitude != null)
    .map(p => ({ id: p.id, name: p.name, lat: Number(p.latitude), lon: Number(p.longitude), address: p.address || '', category: p.category, partner: !!p.is_partner }));
}

export function buildMapHtml({ userLocation }: Pick<PartnersMapViewProps, 'userLocation'>, language: 'en' | 'fr' = 'fr') {
  const center = userLocation ?? DEFAULT_CENTER;
  // Embedded as JSON with "<" escaped so nothing can close the script tag
  const data = JSON.stringify({
    user: userLocation ? { lat: userLocation.latitude, lon: userLocation.longitude } : null,
    center: { lat: center.latitude, lon: center.longitude },
    fr: language === 'fr',
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
        .popup-content { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto; font-size: 12px; min-width: 160px; }
        .popup-name { font-weight: 700; margin-bottom: 3px; font-size: 13px; }
        .popup-category { color: #666; font-size: 11px; }
        .popup-address { color: #666; font-size: 11px; margin-top: 4px; }
        .popup-partner { color: #2563EB; font-weight: 700; font-size: 11px; margin-top: 4px; }
        .popup-go { display: inline-block; margin-top: 8px; color: #2563EB; font-weight: 700; text-decoration: none; }
        .pin { width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; }
        .pin span { transform: rotate(45deg); font-size: 15px; line-height: 1; }
        .pin.partner { border-color: #2563EB; border-width: 3px; }
        .me { width: 16px; height: 16px; border-radius: 50%; background: #2563EB; border: 3px solid #fff; box-shadow: 0 0 0 6px rgba(37,99,235,.25); }
        .locate { position: absolute; z-index: 1000; right: 10px; bottom: 22px; width: 40px; height: 40px; border-radius: 20px; border: 0; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.3); font-size: 18px; cursor: pointer; }
        .loading { position: absolute; z-index: 1000; left: 50%; top: 10px; transform: translateX(-50%); background: rgba(255,255,255,.95); border-radius: 999px; padding: 5px 12px; font: 600 12px -apple-system, Segoe UI, Roboto, sans-serif; color: #333; box-shadow: 0 2px 6px rgba(0,0,0,.2); display: none; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="loading" id="loading"></div>
      <script>
        const data = ${data};
        const KIND = {
          clinic: ['🏥', '#FF6B6B', 'Vétérinaire', 'Vet'], pharmacy: ['💊', '#4ECDC4', 'Pharmacie', 'Pharmacy'],
          supplies: ['🛒', '#45B7D1', 'Animalerie', 'Pet shop'], grooming: ['✨', '#98D8C8', 'Toiletteur', 'Groomer'],
          insurance: ['🛡️', '#FFA07A', 'Assurance', 'Insurance'], food: ['🥗', '#F7DC6F', 'Alimentation', 'Food'],
        };
        const kind = c => KIND[c] || ['🐾', '#888888', c, c];
        const map = L.map('map').setView([data.center.lat, data.center.lon], data.user ? 13 : 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(map);

        // To the app: the web page that holds the iframe, or the phone app's WebView
        const send = message => {
          message.source = 'grrr-map';
          if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
          else if (window.parent !== window) window.parent.postMessage(message, '*');
        };

        const line = (className, text) => { const div = document.createElement('div'); div.className = className; div.textContent = text; return div; };

        if (data.user) {
          L.marker([data.user.lat, data.user.lon], {
            icon: L.divIcon({ className: '', html: '<div class="me"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }),
            zIndexOffset: -1000,
          }).addTo(map).bindPopup(line('popup-name', data.fr ? '📍 Tu es ici' : '📍 You are here'));
          const button = document.createElement('button');
          button.className = 'locate';
          button.textContent = '📍';
          button.title = data.fr ? 'Revenir à ma position' : 'Back to my position';
          button.onclick = () => map.setView([data.user.lat, data.user.lon], 14);
          document.body.appendChild(button);
        }

        // The places: drawn again each time the app sends them, the map staying where it is
        const layer = L.layerGroup().addTo(map);
        const markers = new Map();
        function draw(places) {
          const keep = new Set(places.map(p => p.id));
          for (const [id, marker] of markers) if (!keep.has(id)) { layer.removeLayer(marker); markers.delete(id); }
          for (const place of places) {
            if (markers.has(place.id)) continue;
            const [emoji, color, fr, en] = kind(place.category);
            const pin = document.createElement('div');
            pin.className = 'pin' + (place.partner ? ' partner' : '');
            pin.style.background = color;
            pin.appendChild(document.createElement('span')).textContent = emoji;
            const popup = document.createElement('div');
            popup.className = 'popup-content';
            popup.append(line('popup-name', place.name), line('popup-category', data.fr ? fr : en));
            if (place.address) popup.append(line('popup-address', '📍 ' + place.address));
            if (place.partner) popup.append(line('popup-partner', data.fr ? '🤝 Partenaire GRRR' : '🤝 GRRR partner'));
            const go = document.createElement('a');
            go.className = 'popup-go';
            go.target = '_blank';
            go.rel = 'noopener';
            go.href = 'https://www.google.com/maps/dir/?api=1&destination=' + place.lat + ',' + place.lon;
            go.textContent = data.fr ? 'Y aller →' : 'Directions →';
            popup.append(go);
            const marker = L.marker([place.lat, place.lon], {
              icon: L.divIcon({ className: '', html: pin, iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -28] }),
              zIndexOffset: place.partner ? 500 : 0,
            }).bindPopup(popup);
            layer.addLayer(marker);
            markers.set(place.id, marker);
          }
        }

        const loading = document.getElementById('loading');
        function receive(event) {
          let message = event.data;
          if (typeof message === 'string') { try { message = JSON.parse(message); } catch (e) { return; } }
          if (!message || message.source !== 'grrr-app') return;
          if (message.type === 'places') {
            draw(message.places || []);
            loading.style.display = 'none';
          }
          if (message.type === 'loading') {
            loading.textContent = data.fr ? 'Recherche des lieux…' : 'Finding places…';
            loading.style.display = 'block';
          }
        }
        window.addEventListener('message', receive);
        document.addEventListener('message', receive);

        // Moved or zoomed: the app loads the places of the area now looked at
        const area = type => { const c = map.getCenter(); return { type, latitude: c.lat, longitude: c.lng, km: c.distanceTo(map.getBounds().getNorthEast()) / 1000 }; };
        map.on('moveend', () => send(area('moved')));
        send(area('ready'));
      </script>
    </body>
    </html>
  `;
}
