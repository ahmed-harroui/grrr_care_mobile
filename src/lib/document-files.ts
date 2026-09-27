import { Linking, Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as WebBrowser from 'expo-web-browser';

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export type FileKind = 'image' | 'pdf' | 'other';

// Android Intent.FLAG_GRANT_READ_URI_PERMISSION: lets the viewer app read our cache file
const FLAG_GRANT_READ_URI_PERMISSION = 1;

export function fileKind(mimeType?: string | null, name?: string | null): FileKind {
  const mime = (mimeType || '').toLowerCase();
  const ext = (name || '').split('.').pop()?.toLowerCase();
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'heic', 'webp', 'gif'].includes(ext || '')) return 'image';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  return 'other';
}

export function fileIcon(kind: FileKind) {
  return kind === 'image' ? '🖼️' : kind === 'pdf' ? '📕' : '📎';
}

export function formatSize(bytes?: number | null) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Picked files: web hands us a File object, native a file:// uri
export async function readFileBytes(uri: string, webFile?: Blob | null): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') {
    return webFile ? webFile.arrayBuffer() : (await fetch(uri)).arrayBuffer();
  }
  return new File(uri).arrayBuffer();
}

// Remote (signed) URLs are downloaded to the cache so they can be previewed offline or handed to another app
export async function toLocalFile(url: string, name: string): Promise<File> {
  if (!/^https?:/.test(url)) return new File(url);
  const safeName = name.replace(/[^\w.-]+/g, '_') || 'document';
  return File.downloadFileAsync(url, new File(Paths.cache, safeName), { idempotent: true });
}

// Hands the file to the system: "Open with" on Android, Safari view on iOS, a new tab on web
export async function openExternally(url: string, mimeType: string | null | undefined, name: string) {
  if (Platform.OS === 'web') {
    await Linking.openURL(url);
    return;
  }
  if (Platform.OS === 'android') {
    const file = await toLocalFile(url, name);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: file.contentUri,
      type: mimeType || '*/*',
      flags: FLAG_GRANT_READ_URI_PERMISSION,
    });
    return;
  }
  await WebBrowser.openBrowserAsync(url);
}

// pdf.js renders every page to a canvas: Android's WebView has no built-in PDF viewer
export function pdfViewerHtml(base64: string, background: string) {
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">
<style>
  body { margin: 0; padding: 12px 0; background: ${background}; }
  canvas { display: block; width: calc(100% - 24px); margin: 0 auto 12px; box-shadow: 0 1px 4px rgba(0,0,0,.2); background: #fff; }
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head><body><script>
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const raw = atob('${base64}');
  const data = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) data[i] = raw.charCodeAt(i);
  pdfjsLib.getDocument({ data }).promise.then(async pdf => {
    // Render at screen resolution (times 1.5 so pinch-zoom stays sharp)
    const targetWidth = window.innerWidth * (window.devicePixelRatio || 1) * 1.5;
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale: targetWidth / page.getViewport({ scale: 1 }).width });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      document.body.appendChild(canvas);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      if (n === 1) window.ReactNativeWebView.postMessage('ready');
    }
  }).catch(() => window.ReactNativeWebView.postMessage('error'));
</script></body></html>`;
}
