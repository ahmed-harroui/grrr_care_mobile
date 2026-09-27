import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, ActivityIndicator, Alert, Platform, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { fileKind, fileIcon, openExternally, pdfViewerHtml, toLocalFile } from '../lib/document-files';

interface DocumentPreviewProps {
  url: string;
  mimeType?: string | null;
  name: string;
  onClose: () => void;
}

export function DocumentPreview({ url, mimeType, name, onClose }: DocumentPreviewProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const kind = fileKind(mimeType, name);
  // Android can't show PDFs in a WebView, so the file is downloaded and drawn with pdf.js
  const needsPdfJs = kind === 'pdf' && Platform.OS === 'android';
  const [pdfHtml, setPdfHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!needsPdfJs) return;
    toLocalFile(url, name)
      .then(file => file.base64())
      .then(base64 => setPdfHtml(pdfViewerHtml(base64, colors.backgroundElement)))
      .catch(error => {
        console.warn('PDF preview error:', error);
        setFailed(true);
      });
  }, [needsPdfJs, url, name, colors.backgroundElement]);

  const openWith = async () => {
    setOpening(true);
    try {
      await openExternally(url, mimeType, name);
    } catch (error: any) {
      Alert.alert(t('documents.openError'), error?.message);
    } finally {
      setOpening(false);
    }
  };

  const noPreview = (
    <View style={styles.center}>
      <Text style={styles.bigIcon}>{fileIcon(kind)}</Text>
      <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={2}>{name}</Text>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('documents.noPreview')}</Text>
    </View>
  );

  let body;
  if (kind === 'image') {
    body = (
      <ScrollView
        contentContainerStyle={styles.imageWrap}
        maximumZoomScale={5}
        minimumZoomScale={1}
        centerContent
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        <Image source={{ uri: url }} style={styles.image} resizeMode="contain" onError={() => setFailed(true)} />
      </ScrollView>
    );
  } else if (Platform.OS === 'web' || failed) {
    body = noPreview;
  } else if (needsPdfJs) {
    body = pdfHtml ? (
      <WebView
        originWhitelist={['*']}
        source={{ html: pdfHtml, baseUrl: 'https://localhost/' }}
        onMessage={event => event.nativeEvent.data === 'error' && setFailed(true)}
        style={{ backgroundColor: colors.backgroundElement }}
      />
    ) : (
      <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />
    );
  } else if (Platform.OS === 'ios') {
    // iOS WebView renders PDFs, Word, Excel, text... natively
    body = (
      <WebView
        originWhitelist={['*']}
        source={{ uri: url }}
        allowingReadAccessToURL={url.startsWith('file:') ? url : undefined}
        allowFileAccess
        startInLoadingState
        renderLoading={() => <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />}
        onError={() => setFailed(true)}
        style={{ backgroundColor: colors.backgroundElement }}
      />
    );
  } else {
    body = noPreview;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundElement }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} hitSlop={10}>
          <Text style={[styles.action, { color: colors.textSecondary }]}>{t('documents.close')}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{name}</Text>
        <TouchableOpacity onPress={openWith} disabled={opening} hitSlop={10}>
          {opening ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.action, styles.primary, { color: colors.primary }]}>{t('documents.openWith')}</Text>
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.flex}>{body}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  title: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '800' },
  action: { fontSize: 15, fontWeight: '600' },
  primary: { fontWeight: '800' },
  imageWrap: { flexGrow: 1, justifyContent: 'center' },
  image: { width: '100%', height: '100%', minHeight: 300 },
  loader: { flex: 1, alignSelf: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  bigIcon: { fontSize: 64, marginBottom: 12 },
  fileName: { fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  hint: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
