import { useEffect, useMemo, useRef } from 'react';
import { Linking, View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLanguage } from '../context/LanguageContext';
import { buildMapHtml, mapPlaces, PartnersMapViewProps } from './partners-map-html';

// The page is built once (it only changes with the owner's position): the places are sent to it,
// so the map stays where it was put when the kind of place or the area changes.
export function PartnersMapView({ partners, userLocation, onMove }: PartnersMapViewProps) {
  const { language } = useLanguage();
  const view = useRef<WebView>(null);
  const ready = useRef(false);
  const places = useMemo(() => mapPlaces(partners), [partners]);
  const latest = useRef({ places });
  latest.current = { places };

  const html = useMemo(
    () => buildMapHtml({ userLocation }, language === 'fr' ? 'fr' : 'en'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userLocation?.latitude, userLocation?.longitude, language]
  );

  const post = (message: object) => {
    const text = JSON.stringify(JSON.stringify({ source: 'grrr-app', ...message }));
    view.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message', { data: ${text} })); true;`);
  };

  useEffect(() => {
    ready.current = false;
  }, [html]);

  useEffect(() => {
    if (ready.current) post({ type: 'places', places });
  }, [places]);

  return (
    <View style={styles.container}>
      <WebView
        ref={view}
        source={{ html }}
        style={styles.webview}
        scalesPageToFit
        scrollEnabled
        onMessage={event => {
          let message: any;
          try {
            message = JSON.parse(event.nativeEvent.data);
          } catch {
            return;
          }
          if (message?.source !== 'grrr-map') return;
          if (message.type === 'ready') {
            ready.current = true;
            post({ type: 'places', places: latest.current.places });
          }
          onMove?.({ latitude: message.latitude, longitude: message.longitude, km: message.km });
        }}
        // The "directions" link opens the phone's maps, not inside the map
        onShouldStartLoadWithRequest={request => {
          if (request.url.startsWith('https://www.google.com/maps')) {
            void Linking.openURL(request.url);
            return false;
          }
          return true;
        }}
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
