import { View, StyleSheet } from 'react-native';
import { buildMapHtml, PartnersMapViewProps } from './partners-map-html';

// react-native-webview has no web version: the same Leaflet page runs in an iframe
export function PartnersMapView(props: PartnersMapViewProps) {
  return (
    <View style={styles.container}>
      <iframe
        title="Partners map"
        srcDoc={buildMapHtml(props)}
        style={{ border: 0, width: '100%', height: '100%' }}
        // Scripts only: the page can't reach the app's storage or session
        sandbox="allow-scripts allow-popups"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
