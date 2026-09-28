import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildMapHtml, PartnersMapViewProps } from './partners-map-html';

export function PartnersMapView(props: PartnersMapViewProps) {
  return (
    <View style={styles.container}>
      <WebView
        source={{ html: buildMapHtml(props) }}
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
