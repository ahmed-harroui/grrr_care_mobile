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
  website?: string;
  is_partner?: boolean;
  discount_percent?: number | null;
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
    .map(p => ({
      id: p.id, name: p.name, lat: Number(p.latitude), lon: Number(p.longitude), address: p.address || '', category: p.category,
      partner: !!p.is_partner, discount: p.discount_percent || 0, phone: p.phone || '', website: p.website || '',
    }));
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
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.css" />
      <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.js"></script>
      <style>
        * { margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; }
        #map { width: 100%; height: 100%; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .leaflet-container { background: #e9f1ec; }
        .popup-name { font-weight: 700; font-size: 13px; }
        .pin { width: 34px; height: 34px; box-sizing: border-box; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,.3); display: flex; align-items: center; justify-content: center; font-size: 16px; line-height: 1; transition: transform .15s; }
        .pin.partner { width: 42px; height: 42px; border: 3px solid #2563EB; font-size: 19px; }
        .pin.on { transform: scale(1.25); box-shadow: 0 0 0 4px rgba(37,99,235,.35), 0 3px 8px rgba(0,0,0,.35); }
        .group { width: 40px; height: 40px; box-sizing: border-box; border-radius: 50%; background: #2563EB; color: #fff; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.3); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; }
        .group.big { width: 48px; height: 48px; font-size: 15px; }
        .card { position: absolute; z-index: 1001; left: 10px; right: 10px; bottom: 10px; max-width: 460px; margin: 0 auto; background: #fff; color: #1a1a1a; border-radius: 18px; padding: 14px; box-shadow: 0 6px 24px rgba(0,0,0,.25); display: none; }
        .card.show { display: block; }
        .card-head { display: flex; align-items: center; gap: 12px; }
        .card-icon { width: 42px; height: 42px; border-radius: 21px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex: none; }
        .card-name { font-weight: 800; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .card-meta { color: #666; font-size: 12px; font-weight: 600; margin-top: 2px; }
        .card-meta b { color: #2563EB; }
        .card-close { margin-left: auto; border: 0; background: #f1f3f6; width: 30px; height: 30px; border-radius: 15px; font-size: 18px; cursor: pointer; flex: none; }
        .card-address { color: #444; font-size: 13px; margin-top: 10px; line-height: 1.35; }
        .card-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
        .card-actions a { flex: 1; min-width: 90px; text-align: center; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 8px; border-radius: 12px; background: #eef3ff; color: #2563EB; }
        .card-actions a.primary { background: #2563EB; color: #fff; }
        .me { width: 16px; height: 16px; border-radius: 50%; background: #2563EB; border: 3px solid #fff; box-shadow: 0 0 0 6px rgba(37,99,235,.25); }
        .locate { position: absolute; z-index: 1000; right: 10px; bottom: 26px; width: 40px; height: 40px; border-radius: 20px; border: 0; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.3); font-size: 18px; cursor: pointer; }
        .loading { position: absolute; z-index: 1000; left: 50%; top: 10px; transform: translateX(-50%); background: rgba(255,255,255,.95); border-radius: 999px; padding: 5px 12px; font: 600 12px -apple-system, Segoe UI, Roboto, sans-serif; color: #333; box-shadow: 0 2px 6px rgba(0,0,0,.2); display: none; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="loading" id="loading"></div>
      <div class="card" id="card"></div>
      <script>
        const data = ${data};
        // The same signs and colours as the GRRRR app's map
        const KIND = {
          clinic: ['🩺', '#3CC8C0', 'Vétérinaire', 'Vet'], pharmacy: ['💊', '#8B5CF6', 'Pharmacie', 'Pharmacy'],
          supplies: ['🛍️', '#FFA94D', 'Animalerie', 'Pet shop'], grooming: ['✂️', '#F0566E', 'Toiletteur', 'Groomer'],
          insurance: ['🛡️', '#64748B', 'Assurance', 'Insurance'], food: ['🥗', '#84CC16', 'Alimentation', 'Food'],
        };
        const kind = c => KIND[c] || ['🐾', '#64748B', c, c];
        const map = L.map('map').setView([data.center.lat, data.center.lon], data.user ? 13 : 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);

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

        // The places: drawn again each time the app sends them, the map staying where it is.
        // Nearby places make one round group with their number until the map is close enough.
        const layer = L.markerClusterGroup({
          showCoverageOnHover: false, maxClusterRadius: 48, disableClusteringAtZoom: 15, spiderfyOnMaxZoom: false, chunkedLoading: true,
          iconCreateFunction: group => {
            const n = group.getChildCount();
            return L.divIcon({ className: '', html: '<div class="group' + (n >= 50 ? ' big' : '') + '">' + n + '</div>', iconSize: n >= 50 ? [48, 48] : [40, 40] });
          },
        }).addTo(map);
        const markers = new Map();
        const card = document.getElementById('card');
        let selected = null;
        const link = (text, href, primary) => {
          const a = document.createElement('a');
          a.textContent = text;
          a.href = href;
          a.target = '_blank';
          a.rel = 'noopener';
          if (primary) a.className = 'primary';
          return a;
        };
        function closeCard() {
          card.classList.remove('show');
          if (selected) selected.getElement()?.firstChild?.classList.remove('on');
          selected = null;
        }
        // A place touched: its card at the bottom, like in the GRRRR app
        function openCard(place, marker) {
          closeCard();
          selected = marker;
          marker.getElement()?.firstChild?.classList.add('on');
          const [emoji, color, fr, en] = kind(place.category);
          card.replaceChildren();
          const head = document.createElement('div');
          head.className = 'card-head';
          const icon = line('card-icon', emoji);
          icon.style.background = color;
          const text = document.createElement('div');
          text.style.minWidth = '0';
          const meta = line('card-meta', data.fr ? fr : en);
          if (place.partner) {
            const badge = document.createElement('b');
            badge.textContent = (data.fr ? ' · 🤝 Partenaire GRRR' : ' · 🤝 GRRR partner') + (place.discount ? ' −' + place.discount + ' %' : '');
            meta.append(badge);
          }
          text.append(line('card-name', place.name), meta);
          const close = document.createElement('button');
          close.className = 'card-close';
          close.textContent = '×';
          close.setAttribute('aria-label', data.fr ? 'Fermer' : 'Close');
          close.onclick = closeCard;
          head.append(icon, text, close);
          card.append(head);
          if (place.address) card.append(line('card-address', '📍 ' + place.address));
          const actions = document.createElement('div');
          actions.className = 'card-actions';
          actions.append(link(data.fr ? 'Itinéraire' : 'Directions', 'https://www.google.com/maps/dir/?api=1&destination=' + place.lat + ',' + place.lon, true));
          if (place.phone) actions.append(link(data.fr ? 'Appeler' : 'Call', 'tel:' + place.phone.replace(/[^+0-9]/g, '')));
          if (place.website) actions.append(link(data.fr ? 'Site web' : 'Website', /^https?:/.test(place.website) ? place.website : 'https://' + place.website));
          card.append(actions);
          card.classList.add('show');
        }
        map.on('click', closeCard);
        function draw(places) {
          const keep = new Set(places.map(p => p.id));
          const gone = [];
          for (const [id, marker] of markers) {
            if (keep.has(id)) continue;
            gone.push(marker);
            markers.delete(id);
            if (marker === selected) closeCard();
          }
          layer.removeLayers(gone);
          const added = [];
          for (const place of places) {
            if (markers.has(place.id)) continue;
            const [emoji, color] = kind(place.category);
            const size = place.partner ? 42 : 34;
            const pin = document.createElement('div');
            pin.className = 'pin' + (place.partner ? ' partner' : '');
            pin.style.background = color;
            pin.textContent = emoji;
            const marker = L.marker([place.lat, place.lon], {
              icon: L.divIcon({ className: '', html: pin, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
              title: place.name,
              zIndexOffset: place.partner ? 500 : 0,
            });
            marker.on('click', event => { L.DomEvent.stopPropagation(event); openCard(place, marker); });
            added.push(marker);
            markers.set(place.id, marker);
          }
          layer.addLayers(added);
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
