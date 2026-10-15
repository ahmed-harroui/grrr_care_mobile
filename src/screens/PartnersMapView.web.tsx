import { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { buildMapHtml, mapPlaces, PartnersMapViewProps } from './partners-map-html';

// react-native-webview has no web version: the same Leaflet page runs in an iframe.
// The page is built once (it only changes with the owner's position): the places are sent to it,
// so the map stays where it was put when the kind of place or the area changes.
export function PartnersMapView({ partners, userLocation, onMove }: PartnersMapViewProps) {
  const { language } = useLanguage();
  const frame = useRef<HTMLIFrameElement | null>(null);
  const ready = useRef(false);
  const places = useMemo(() => mapPlaces(partners), [partners]);
  const latest = useRef({ places, onMove });
  latest.current = { places, onMove };

  const html = useMemo(
    () => buildMapHtml({ userLocation }, language === 'fr' ? 'fr' : 'en'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userLocation?.latitude, userLocation?.longitude, language]
  );

  const post = (message: object) => frame.current?.contentWindow?.postMessage({ source: 'grrr-app', ...message }, '*');

  useEffect(() => {
    ready.current = false;
    const listen = (event: MessageEvent) => {
      // Only this map's page (its origin is "null": the iframe is sandboxed)
      if (event.source !== frame.current?.contentWindow || event.data?.source !== 'grrr-map') return;
      if (event.data.type === 'ready') {
        ready.current = true;
        post({ type: 'places', places: latest.current.places });
      }
      latest.current.onMove?.({ latitude: event.data.latitude, longitude: event.data.longitude, km: event.data.km });
    };
    window.addEventListener('message', listen);
    return () => window.removeEventListener('message', listen);
  }, [html]);

  useEffect(() => {
    if (ready.current) post({ type: 'places', places });
  }, [places]);

  return (
    <View style={styles.container}>
      <iframe
        ref={frame}
        title="Partners map"
        srcDoc={html}
        style={{ border: 0, width: '100%', height: '100%' }}
        // Scripts only: the page can't reach the app's storage or session (popups: the "directions" link)
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
