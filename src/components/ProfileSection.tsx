import { ReactNode, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  KeyboardTypeOptions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

type Photo = { uri: string; base64: string; mimeType: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Profile and account block of the Settings page: identity card, edit sheet, password sheet and log out
export function ProfileSection() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user, isDemo, logout, updateProfile, updateEmail, updatePassword } = useAuth();

  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  if (!user) return null;

  const confirmLogout = () => {
    Alert.alert(isDemo ? t('settings.exitDemo') : t('settings.logout'), isDemo ? undefined : t('settings.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: isDemo ? t('settings.exitDemo') : t('settings.logout'),
        style: 'destructive',
        onPress: () => logout().catch(error => Alert.alert(t('settings.saveError'), error?.message)),
      },
    ]);
  };

  return (
    <>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.profile')}</Text>

        <TouchableOpacity
          style={[styles.card, styles.identity, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setEditing(true)}
          activeOpacity={0.8}
        >
          <Avatar uri={user.avatarUrl} name={user.name} size={56} />
          <View style={styles.identityText}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {user.name || user.email?.split('@')[0]}
            </Text>
            <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>
              {user.email}
            </Text>
          </View>
          <Text style={[styles.editLink, { color: colors.primary }]}>{t('common.edit')}</Text>
        </TouchableOpacity>

        {isDemo && <Text style={[styles.notice, { color: colors.textTertiary }]}>{t('settings.demoNotice')}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.account')}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {!isDemo && (
            <TouchableOpacity
              style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
              onPress={() => setChangingPassword(true)}
            >
              <Text style={[styles.rowText, { color: colors.text }]}>{t('settings.changePassword')}</Text>
              <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.row} onPress={confirmLogout}>
            <Text style={[styles.rowText, { color: colors.error }]}>
              {isDemo ? t('settings.exitDemo') : t('settings.logout')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {editing && (
        <EditProfileSheet
          initialName={user.name ?? ''}
          initialEmail={user.email ?? ''}
          avatarUrl={user.avatarUrl}
          isDemo={isDemo}
          onClose={() => setEditing(false)}
          onSave={async ({ name, email, photo }) => {
            await updateProfile({ name, photo });
            if (!isDemo && email !== user.email) {
              await updateEmail(email);
              Alert.alert(t('settings.email'), t('settings.emailConfirm', { email }));
            }
          }}
        />
      )}

      {changingPassword && (
        <PasswordSheet
          onClose={() => setChangingPassword(false)}
          onSave={async password => {
            await updatePassword(password);
            Alert.alert(t('settings.changePassword'), t('settings.passwordChanged'));
          }}
        />
      )}
    </>
  );
}

function Avatar({ uri, name, size }: { uri?: string | null; name?: string; size: number }) {
  const { colors } = useTheme();
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={round} />;
  return (
    <View style={[round, styles.avatarFallback, { backgroundColor: colors.primaryLight }]}>
      <Text style={[styles.avatarInitial, { color: colors.primaryDeep, fontSize: size * 0.4 }]}>
        {(name?.trim()[0] ?? '🐾').toUpperCase()}
      </Text>
    </View>
  );
}

// Bottom sheet with Cancel / title / Save, shared by both editors
function Sheet({
  title,
  saving,
  onClose,
  onSave,
  children,
}: {
  title: string;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.sheet, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} disabled={saving}>
            <Text style={[styles.sheetAction, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>
          <TouchableOpacity onPress={onSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={[styles.sheetAction, styles.sheetSave, { color: colors.primary }]}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  editable = true,
  keyboard,
  secure,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  editable?: boolean;
  keyboard?: KeyboardTypeOptions;
  secure?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        editable={editable}
        keyboardType={keyboard}
        secureTextEntry={secure}
        autoCapitalize={keyboard === 'email-address' || secure ? 'none' : 'words'}
        autoCorrect={false}
        style={[
          styles.input,
          { color: editable ? colors.text : colors.textTertiary, backgroundColor: colors.backgroundElement, borderColor: colors.border },
        ]}
      />
    </View>
  );
}

function EditProfileSheet({
  initialName,
  initialEmail,
  avatarUrl,
  isDemo,
  onClose,
  onSave,
}: {
  initialName: string;
  initialEmail: string;
  avatarUrl?: string | null;
  isDemo: boolean;
  onClose: () => void;
  onSave: (fields: { name: string; email: string; photo: Photo | null }) => Promise<void>;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [saving, setSaving] = useState(false);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('settings.photoPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (asset?.base64) {
      setPhoto({ uri: asset.uri, base64: asset.base64, mimeType: asset.mimeType || 'image/jpeg' });
    }
  };

  const save = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!name.trim()) {
      Alert.alert(t('settings.nameRequired'));
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      Alert.alert(t('settings.invalidEmail'));
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), email: trimmedEmail, photo });
      onClose();
    } catch (error: any) {
      Alert.alert(t('settings.saveError'), error?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet title={t('settings.editProfile')} saving={saving} onClose={onClose} onSave={save}>
      <TouchableOpacity style={styles.photoWrap} onPress={pickPhoto} activeOpacity={0.8}>
        <Avatar uri={photo?.uri ?? avatarUrl} name={name} size={104} />
        <Text style={[styles.photoHint, { color: colors.primary }]}>{t('settings.changePhoto')}</Text>
      </TouchableOpacity>
      <Field label={t('settings.name')} value={name} onChange={setName} />
      <Field label={t('settings.email')} value={email} onChange={setEmail} keyboard="email-address" editable={!isDemo} />
    </Sheet>
  );
}

function PasswordSheet({ onClose, onSave }: { onClose: () => void; onSave: (password: string) => Promise<void> }) {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (password.length < 6) {
      Alert.alert(t('settings.passwordTooShort'));
      return;
    }
    if (password !== confirm) {
      Alert.alert(t('settings.passwordMismatch'));
      return;
    }
    setSaving(true);
    try {
      await onSave(password);
      onClose();
    } catch (error: any) {
      Alert.alert(t('settings.saveError'), error?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet title={t('settings.changePassword')} saving={saving} onClose={onClose} onSave={save}>
      <Field label={t('settings.newPassword')} value={password} onChange={setPassword} secure />
      <Field label={t('settings.confirmPassword')} value={confirm} onChange={setConfirm} secure />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  section: { marginVertical: 16, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12, textTransform: 'uppercase' },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  identityText: { flex: 1 },
  name: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  email: { fontSize: 13, fontWeight: '500' },
  editLink: { fontSize: 14, fontWeight: '700' },
  notice: { fontSize: 12, marginTop: 8, lineHeight: 17 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  rowText: { fontSize: 15, fontWeight: '600' },
  chevron: { fontSize: 22, fontWeight: '400' },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontWeight: '800' },
  sheet: { flex: 1 },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800' },
  sheetAction: { fontSize: 15, fontWeight: '600', minWidth: 70 },
  sheetSave: { textAlign: 'right', fontWeight: '800' },
  sheetContent: { padding: 20, paddingBottom: 48 },
  photoWrap: { alignSelf: 'center', alignItems: 'center', marginBottom: 20 },
  photoHint: { fontSize: 13, fontWeight: '700', marginTop: 10 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
});
