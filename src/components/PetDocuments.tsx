import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  KeyboardTypeOptions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  grrrCareApi,
  DOCUMENT_TYPES,
  DocumentType,
  PetDocument,
  PetDocumentFields,
  isAwaitingRead,
} from '../lib/grrrr-care-api';
import { MAX_DOCUMENT_BYTES, fileIcon, fileKind, formatSize, readFileBytes } from '../lib/document-files';
import { DocumentPreview } from './DocumentPreview';

const DOC_ICONS: Record<DocumentType, string> = {
  passport: '🪪',
  microchip_certificate: '📡',
  adoption: '🏠',
  ownership: '📜',
  registration: '🗂️',
  import_export: '✈️',
  other: '📄',
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const orNull = (v: string) => (v.trim() ? v.trim() : null);

interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  webFile?: Blob | null;
}

interface PreviewTarget {
  url: string;
  mimeType?: string | null;
  name: string;
}

const displayName = (doc: PetDocument) => doc.file_name || doc.file_path?.split('/').pop() || 'document';

interface PetDocumentsProps {
  petId: string;
  ownerId: string;
}

export function PetDocuments({ petId, ownerId }: PetDocumentsProps) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const [documents, setDocuments] = useState<PetDocument[] | null>(null);
  // undefined = closed, null = new document, otherwise the document being edited
  const [editing, setEditing] = useState<PetDocument | null | undefined>(undefined);
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  const load = useCallback(() => {
    grrrCareApi
      .getPetDocuments(petId)
      .then(setDocuments)
      .catch(error => {
        console.warn('Documents fetch error:', error);
        setDocuments([]);
      });
  }, [petId]);

  useEffect(load, [load]);

  // New or replaced files are read once by the assistant in the background; each file is tried once per visit
  const attemptedReads = useRef(new Set<string>());
  const [reading, setReading] = useState(false);
  useEffect(() => {
    const toRead = (documents ?? []).filter(d => isAwaitingRead(d) && !attemptedReads.current.has(d.file_path!));
    if (!toRead.length) return;
    toRead.forEach(d => attemptedReads.current.add(d.file_path!));
    setReading(true);
    grrrCareApi
      .readPetDocumentFiles(petId, language)
      .then(() => grrrCareApi.getPetDocuments(petId))
      .then(setDocuments)
      .catch(error => console.warn('Document read error:', error))
      .finally(() => setReading(false));
  }, [documents, petId, language]);

  const typeLabel = (type: DocumentType) => t(`documents.types.${type}`);
  const isExpired = (doc: PetDocument) => !!doc.expires_on && doc.expires_on < new Date().toISOString().slice(0, 10);

  const quickLook = async (doc: PetDocument) => {
    if (!doc.file_path) return;
    setPreviewLoading(doc.id);
    try {
      const url = await grrrCareApi.getDocumentFileUrl(doc.file_path);
      setPreview({ url, mimeType: doc.file_mime, name: displayName(doc) });
    } catch (error: any) {
      Alert.alert(t('documents.openError'), error?.message);
    } finally {
      setPreviewLoading(null);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{t('documents.title')}</Text>
        <TouchableOpacity onPress={() => setEditing(null)} hitSlop={8}>
          <Text style={[styles.addLink, { color: colors.primary }]}>+ {t('common.add')}</Text>
        </TouchableOpacity>
      </View>

      {documents === null ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : documents.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>{t('documents.empty')}</Text>
      ) : (
        documents.map(doc => (
          <TouchableOpacity
            key={doc.id}
            onPress={() => setEditing(doc)}
            style={[styles.docRow, { borderColor: colors.border, backgroundColor: colors.backgroundElement }]}
          >
            <Text style={styles.docIcon}>{DOC_ICONS[doc.doc_type] ?? '📄'}</Text>
            <View style={styles.flex}>
              <Text style={[styles.docTitle, { color: colors.text }]} numberOfLines={1}>
                {doc.title || typeLabel(doc.doc_type)}
              </Text>
              <Text style={[styles.docMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                {[doc.title ? typeLabel(doc.doc_type) : null, doc.document_number].filter(Boolean).join(' · ') ||
                  t('documents.noDetails')}
              </Text>
              {!!doc.expires_on && (
                <Text style={[styles.expiry, { color: isExpired(doc) ? '#D64545' : colors.textTertiary }]}>
                  {isExpired(doc) ? t('documents.expired') : `${t('documents.expiresOn')} ${doc.expires_on}`}
                </Text>
              )}
              {isAwaitingRead(doc) && reading ? (
                <Text style={[styles.readStatus, { color: colors.textTertiary }]}>⏳ {t('documents.reading')}</Text>
              ) : !isAwaitingRead(doc) && doc.ai_summary_status === 'done' ? (
                <Text style={[styles.readStatus, { color: colors.primary }]}>✓ {t('documents.readByGrrr')}</Text>
              ) : null}
            </View>
            {!!doc.file_path && (
              <TouchableOpacity
                onPress={() => quickLook(doc)}
                hitSlop={8}
                style={[styles.eyeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                {previewLoading === doc.id ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Text style={styles.eyeIcon}>👁️</Text>
                )}
              </TouchableOpacity>
            )}
            <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
          </TouchableOpacity>
        ))
      )}

      <Modal
        visible={editing !== undefined}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditing(undefined)}
      >
        {editing !== undefined && (
          <DocumentEditor
            petId={petId}
            ownerId={ownerId}
            document={editing}
            onClose={changed => {
              setEditing(undefined);
              if (changed) load();
            }}
          />
        )}
      </Modal>

      <Modal visible={!!preview} animationType="slide" onRequestClose={() => setPreview(null)}>
        {preview && <DocumentPreview {...preview} onClose={() => setPreview(null)} />}
      </Modal>
    </View>
  );
}

interface DocumentEditorProps {
  petId: string;
  ownerId: string;
  document: PetDocument | null;
  onClose: (changed: boolean) => void;
}

function DocumentEditor({ petId, ownerId, document, onClose }: DocumentEditorProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [docType, setDocType] = useState<DocumentType>(document?.doc_type ?? 'passport');
  const [title, setTitle] = useState(str(document?.title));
  const [number, setNumber] = useState(str(document?.document_number));
  const [issuedOn, setIssuedOn] = useState(str(document?.issued_on));
  const [expiresOn, setExpiresOn] = useState(str(document?.expires_on));
  const [issuer, setIssuer] = useState(str(document?.issuer));
  const [notes, setNotes] = useState(str(document?.notes));
  const [file, setFile] = useState<PickedFile | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!document?.file_path) return;
    grrrCareApi
      .getDocumentFileUrl(document.file_path)
      .then(setExistingUrl)
      .catch(error => console.warn('Document file URL error:', error));
  }, [document?.file_path]);

  const acceptFile = (picked: PickedFile) => {
    if (picked.size && picked.size > MAX_DOCUMENT_BYTES) {
      Alert.alert(t('documents.fileTooLarge'));
      return;
    }
    setFile(picked);
    setRemoveFile(false);
  };

  const pickImage = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('documents.filePermission'));
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? null : result.assets[0];
    if (asset) {
      acceptFile({
        uri: asset.uri,
        name: asset.fileName || 'scan.jpg',
        mimeType: asset.mimeType || 'image/jpeg',
        size: asset.fileSize,
        webFile: asset.file,
      });
    }
  };

  // PDFs, Word, scans from the Files app / Google Drive...
  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    const asset = result.canceled ? null : result.assets[0];
    if (asset) {
      acceptFile({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || 'application/octet-stream',
        size: asset.size,
        webFile: asset.file,
      });
    }
  };

  const save = async () => {
    if (docType === 'other' && !title.trim()) {
      Alert.alert(t('documents.titleRequired'));
      return;
    }
    if ([issuedOn, expiresOn].some(d => d.trim() && !DATE_RE.test(d.trim()))) {
      Alert.alert(t('documents.invalidDate'));
      return;
    }

    setSaving(true);
    try {
      const fields: PetDocumentFields = {
        doc_type: docType,
        title: orNull(title),
        document_number: orNull(number),
        issued_on: orNull(issuedOn),
        expires_on: orNull(expiresOn),
        issuer: orNull(issuer),
        notes: orNull(notes),
      };
      if (file) {
        const bytes = await readFileBytes(file.uri, file.webFile);
        if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
          Alert.alert(t('documents.fileTooLarge'));
          return;
        }
        fields.file_path = await grrrCareApi.uploadDocumentFile(ownerId, { ...file, bytes });
        fields.file_mime = file.mimeType;
        fields.file_name = file.name;
        fields.file_size = bytes.byteLength;
      } else if (removeFile) {
        fields.file_path = null;
        fields.file_mime = null;
        fields.file_name = null;
        fields.file_size = null;
      }
      await grrrCareApi.savePetDocument(petId, fields, document?.id);
      if ((file || removeFile) && document?.file_path) {
        grrrCareApi.removeDocumentFile(document.file_path).catch(error => console.warn('Old file cleanup error:', error));
      }
      onClose(true);
    } catch (error: any) {
      const missingTable = error?.code === '42P01' || error?.code === 'PGRST205';
      const missingColumn = error?.code === 'PGRST204';
      Alert.alert(
        t('documents.saveError'),
        missingTable || missingColumn ? t('documents.dbNotReady') : error?.message
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!document) return;
    Alert.alert(t('documents.deleteTitle'), t('documents.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await grrrCareApi.deletePetDocument(document);
            onClose(true);
          } catch (error: any) {
            Alert.alert(t('documents.saveError'), error?.message);
          }
        },
      },
    ]);
  };

  const input = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts: { placeholder?: string; keyboard?: KeyboardTypeOptions; multiline?: boolean } = {}
  ) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={opts.placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType={opts.keyboard}
        multiline={opts.multiline}
        style={[
          styles.input,
          opts.multiline && styles.inputMultiline,
          { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.border },
        ]}
      />
    </View>
  );

  // What the file card shows: the newly picked file, else the saved one (unless removed)
  const current: (PreviewTarget & { size?: number | null }) | null = file
    ? { url: file.uri, mimeType: file.mimeType, name: file.name, size: file.size }
    : document?.file_path && !removeFile
      ? existingUrl
        ? { url: existingUrl, mimeType: document.file_mime, name: displayName(document), size: document.file_size }
        : null
      : null;
  const waitingForUrl = !file && !removeFile && !!document?.file_path && !existingUrl;
  const currentKind = current ? fileKind(current.mimeType, current.name) : null;

  const sourceBtn = (label: string, onPress: () => void) => (
    <TouchableOpacity
      style={[styles.fileBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
      onPress={onPress}
    >
      <Text style={[styles.fileBtnText, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => onClose(false)} hitSlop={10}>
          <Text style={[styles.headerAction, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
          {document ? t('documents.editDocument') : t('documents.newDocument')}
        </Text>
        <TouchableOpacity onPress={save} disabled={saving} hitSlop={10}>
          {saving ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.headerAction, styles.headerSave, { color: colors.primary }]}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('documents.type')}</Text>
        <View style={styles.chips}>
          {DOCUMENT_TYPES.map(type => {
            const selected = type === docType;
            return (
              <TouchableOpacity
                key={type}
                onPress={() => setDocType(type)}
                style={[
                  styles.chip,
                  { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.card },
                ]}
              >
                <Text style={[styles.chipText, { color: selected ? '#FFFFFF' : colors.text }]}>
                  {DOC_ICONS[type]} {t(`documents.types.${type}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {input(docType === 'other' ? t('documents.name') : t('documents.nameOptional'), title, setTitle, {
          placeholder: t('documents.namePlaceholder'),
        })}
        {input(t('documents.number'), number, setNumber)}
        <View style={styles.row}>
          <View style={styles.flex}>
            {input(t('documents.issuedOn'), issuedOn, setIssuedOn, { placeholder: t('petForm.birthdayPlaceholder') })}
          </View>
          <View style={styles.flex}>
            {input(t('documents.expiresOn'), expiresOn, setExpiresOn, { placeholder: t('petForm.birthdayPlaceholder') })}
          </View>
        </View>
        {input(t('documents.issuer'), issuer, setIssuer, { placeholder: t('documents.issuerPlaceholder') })}
        {input(t('documents.notes'), notes, setNotes, { multiline: true })}

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('documents.file')}</Text>
        {waitingForUrl && <ActivityIndicator color={colors.primary} style={styles.loader} />}
        {current && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setPreviewOpen(true)}
            style={[styles.fileCard, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            {currentKind === 'image' ? (
              <Image source={{ uri: current.url }} style={styles.thumb} resizeMode="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbIcon, { backgroundColor: colors.backgroundElement }]}>
                <Text style={styles.thumbEmoji}>{fileIcon(currentKind!)}</Text>
              </View>
            )}
            <View style={styles.flex}>
              <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={2}>{current.name}</Text>
              <Text style={[styles.fileMeta, { color: colors.textSecondary }]}>
                {[formatSize(current.size), t('documents.tapToPreview')].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Text style={styles.eyeIcon}>👁️</Text>
          </TouchableOpacity>
        )}
        <View style={styles.row}>
          {sourceBtn(`📷 ${t('documents.scan')}`, () => pickImage('camera'))}
          {sourceBtn(`🖼️ ${t('documents.gallery')}`, () => pickImage('library'))}
          {sourceBtn(`📁 ${t('documents.files')}`, pickDocument)}
        </View>
        <Text style={[styles.fileHint, { color: colors.textTertiary }]}>{t('documents.fileHint')}</Text>
        {(current || waitingForUrl) && (
          <TouchableOpacity
            onPress={() => {
              setFile(null);
              setRemoveFile(true);
            }}
          >
            <Text style={styles.removeFile}>{t('documents.removeFile')}</Text>
          </TouchableOpacity>
        )}

        {/* What the assistant took from the saved file (hidden once the file is replaced or removed) */}
        {document?.file_path && !file && !removeFile && !isAwaitingRead(document) && document.ai_summary_status && (
          <View style={[styles.summaryBox, { borderColor: colors.border, backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>📖 {t('documents.whatGrrrRead')}</Text>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
              {document.ai_summary_status === 'done'
                ? document.ai_summary
                : document.ai_summary_status === 'unsupported'
                  ? t('documents.readUnsupported')
                  : t('documents.readFailed')}
            </Text>
          </View>
        )}

        {document && (
          <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
            <Text style={styles.deleteText}>{t('documents.delete')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={previewOpen && !!current} animationType="slide" onRequestClose={() => setPreviewOpen(false)}>
        {current && <DocumentPreview {...current} onClose={() => setPreviewOpen(false)} />}
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  addLink: { fontSize: 14, fontWeight: '800' },
  loader: { marginVertical: 12 },
  empty: { fontSize: 13, lineHeight: 19 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  docIcon: { fontSize: 24 },
  docTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  docMeta: { fontSize: 12 },
  expiry: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  readStatus: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  summaryBox: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 12 },
  summaryTitle: { fontSize: 12, fontWeight: '800', marginBottom: 6 },
  summaryText: { fontSize: 13, lineHeight: 19 },
  eyeBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  eyeIcon: { fontSize: 18 },
  chevron: { fontSize: 22, fontWeight: '300' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800' },
  headerAction: { fontSize: 15, fontWeight: '600' },
  headerSave: { fontWeight: '800' },
  modalContent: { padding: 20, paddingBottom: 48 },
  field: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8 },
  fileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  thumb: { width: 64, height: 64, borderRadius: 10 },
  thumbIcon: { justifyContent: 'center', alignItems: 'center' },
  thumbEmoji: { fontSize: 30 },
  fileName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  fileMeta: { fontSize: 12 },
  fileBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  fileBtnText: { fontSize: 13, fontWeight: '700' },
  fileHint: { fontSize: 11, textAlign: 'center', marginTop: 8 },
  removeFile: { color: '#D64545', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  deleteBtn: { marginTop: 28, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#D64545', alignItems: 'center' },
  deleteText: { color: '#D64545', fontSize: 15, fontWeight: '800' },
});
