import { useCallback, useEffect, useState } from 'react';
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
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  grrrCareApi,
  DOCUMENT_TYPES,
  DocumentType,
  PetDocument,
  PetDocumentFields,
} from '../lib/grrrr-care-api';

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

interface PetDocumentsProps {
  petId: string;
  ownerId: string;
}

export function PetDocuments({ petId, ownerId }: PetDocumentsProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [documents, setDocuments] = useState<PetDocument[] | null>(null);
  // undefined = closed, null = new document, otherwise the document being edited
  const [editing, setEditing] = useState<PetDocument | null | undefined>(undefined);

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

  const typeLabel = (type: DocumentType) => t(`documents.types.${type}`);
  const isExpired = (doc: PetDocument) => !!doc.expires_on && doc.expires_on < new Date().toISOString().slice(0, 10);

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
                {[doc.title ? typeLabel(doc.doc_type) : null, doc.document_number, doc.file_path ? '📎' : null]
                  .filter(Boolean)
                  .join(' · ') || t('documents.noDetails')}
              </Text>
            </View>
            {!!doc.expires_on && (
              <Text style={[styles.expiry, { color: isExpired(doc) ? '#D64545' : colors.textTertiary }]}>
                {isExpired(doc) ? t('documents.expired') : doc.expires_on}
              </Text>
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
  const [file, setFile] = useState<{ uri: string; base64: string; mimeType: string } | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!document?.file_path) return;
    grrrCareApi
      .getDocumentFileUrl(document.file_path)
      .then(setExistingUrl)
      .catch(error => console.warn('Document file URL error:', error));
  }, [document?.file_path]);

  const pickFile = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('documents.filePermission'));
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, base64: true };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? null : result.assets[0];
    if (asset?.base64) {
      setFile({ uri: asset.uri, base64: asset.base64, mimeType: asset.mimeType || 'image/jpeg' });
      setRemoveFile(false);
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
        fields.file_path = await grrrCareApi.uploadDocumentFile(ownerId, file.base64, file.mimeType);
        fields.file_mime = file.mimeType;
      } else if (removeFile) {
        fields.file_path = null;
        fields.file_mime = null;
      }
      await grrrCareApi.savePetDocument(petId, fields, document?.id);
      if ((file || removeFile) && document?.file_path) {
        grrrCareApi.removeDocumentFile(document.file_path).catch(error => console.warn('Old file cleanup error:', error));
      }
      onClose(true);
    } catch (error: any) {
      const missingTable = error?.code === '42P01' || error?.code === 'PGRST205';
      Alert.alert(t('documents.saveError'), missingTable ? t('documents.dbNotReady') : error?.message);
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

  const previewUri = file?.uri ?? (removeFile ? null : existingUrl);
  const hasFile = !!file || (!!document?.file_path && !removeFile);

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
        {previewUri && <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="contain" />}
        {hasFile && !previewUri && <ActivityIndicator color={colors.primary} style={styles.loader} />}
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.fileBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => pickFile('camera')}
          >
            <Text style={[styles.fileBtnText, { color: colors.text }]}>📷 {t('documents.scan')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fileBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => pickFile('library')}
          >
            <Text style={[styles.fileBtnText, { color: colors.text }]}>🖼️ {t('documents.gallery')}</Text>
          </TouchableOpacity>
        </View>
        {hasFile && (
          <TouchableOpacity
            onPress={() => {
              setFile(null);
              setRemoveFile(true);
            }}
          >
            <Text style={styles.removeFile}>{t('documents.removeFile')}</Text>
          </TouchableOpacity>
        )}

        {document && (
          <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
            <Text style={styles.deleteText}>{t('documents.delete')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
  expiry: { fontSize: 11, fontWeight: '700' },
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
  row: { flexDirection: 'row', gap: 12 },
  preview: { width: '100%', height: 220, borderRadius: 12, marginBottom: 12 },
  fileBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  fileBtnText: { fontSize: 14, fontWeight: '700' },
  removeFile: { color: '#D64545', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  deleteBtn: { marginTop: 28, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#D64545', alignItems: 'center' },
  deleteText: { color: '#D64545', fontSize: 15, fontWeight: '800' },
});
