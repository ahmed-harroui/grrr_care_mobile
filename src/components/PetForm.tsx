import { ReactNode, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  KeyboardTypeOptions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { grrrCareApi, PetFields } from '../lib/grrrr-care-api';
import { PetAvatar } from './PetAvatar';

const SPECIES = ['dog', 'cat', 'rabbit', 'bird', 'other'] as const;

interface PetFormProps {
  ownerId: string;
  pet?: any;
  onSaved: (pet: any) => void;
  header?: ReactNode;
  footer?: ReactNode;
}

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const orNull = (v: string) => (v.trim() ? v.trim() : null);

export function PetForm({ ownerId, pet, onSaved, header, footer }: PetFormProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  // A starter card's placeholder name ("Nouveau compagnon") is not the pet's real name
  const [name, setName] = useState(pet?.setup_pending ? '' : str(pet?.pet_name));
  const [species, setSpecies] = useState(str(pet?.species).toLowerCase() || 'dog');
  const [breed, setBreed] = useState(str(pet?.breed));
  const [gender, setGender] = useState<string | null>(pet?.gender ?? null);
  const [age, setAge] = useState(pet?.age ? String(pet.age) : '');
  const [weight, setWeight] = useState(str(pet?.weight));
  const [birthday, setBirthday] = useState(str(pet?.birthday));
  const [color, setColor] = useState(str(pet?.color));
  const [marks, setMarks] = useState(str(pet?.distinguishing_marks));
  const [microchip, setMicrochip] = useState(str(pet?.microchip));
  const [tattoo, setTattoo] = useState(str(pet?.tattoo));
  const [registration, setRegistration] = useState(str(pet?.registration_number));
  const [ownerName, setOwnerName] = useState(str(pet?.owner_name));
  const [ownerPhone, setOwnerPhone] = useState(str(pet?.owner_phone));
  const [ownerEmail, setOwnerEmail] = useState(str(pet?.owner_email));
  const [ownerAddress, setOwnerAddress] = useState(str(pet?.owner_address));
  const [sterilized, setSterilized] = useState<boolean>(!!pet?.sterilized);
  const [allergies, setAllergies] = useState(str(pet?.allergies));
  const [notes, setNotes] = useState(str(pet?.care_notes));
  const [photo, setPhoto] = useState<{ uri: string; base64: string; mimeType: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const isKnownSpecies = SPECIES.slice(0, 4).some(s => species.includes(s));

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('petForm.photoPermission'));
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
    if (!name.trim()) {
      Alert.alert(t('petForm.nameRequired'));
      return;
    }
    if (birthday.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(birthday.trim())) {
      Alert.alert(t('petForm.invalidBirthday'));
      return;
    }

    setSaving(true);
    try {
      const fields: PetFields = {
        pet_name: name.trim(),
        species,
        breed: breed.trim(),
        gender,
        age: Math.min(80, Math.max(0, parseInt(age, 10) || 0)),
        weight: weight.trim() ? parseFloat(weight.replace(',', '.')) || null : null,
        birthday: orNull(birthday),
        color: orNull(color),
        distinguishing_marks: orNull(marks),
        microchip: orNull(microchip),
        tattoo: orNull(tattoo),
        registration_number: orNull(registration),
        owner_name: orNull(ownerName),
        owner_phone: orNull(ownerPhone),
        owner_email: orNull(ownerEmail),
        owner_address: orNull(ownerAddress),
        sterilized,
        allergies: orNull(allergies),
        care_notes: orNull(notes),
        ...(pet?.setup_pending ? { setup_pending: false } : {}),
      };
      if (photo) {
        fields.photo_url = await grrrCareApi.uploadPetPhoto(ownerId, photo.base64, photo.mimeType);
      }
      const saved = pet?.id
        ? await grrrCareApi.updatePet(pet.id, fields)
        : await grrrCareApi.createPet(ownerId, fields);
      onSaved(saved);
    } catch (error: any) {
      const missingColumn = error?.code === 'PGRST204';
      Alert.alert(t('petForm.saveError'), missingColumn ? t('petForm.dbNotReady') : error?.message);
    } finally {
      setSaving(false);
    }
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

  const chip = (label: string, selected: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={label}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.card },
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? '#FFFFFF' : colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {header}

        <TouchableOpacity style={styles.photoWrap} onPress={pickPhoto} activeOpacity={0.8}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.photo} />
          ) : (
            <PetAvatar photoUrl={pet?.photo_url} species={species} size={112} />
          )}
          <View style={[styles.photoBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
            <Text style={styles.photoBadgeText}>📷</Text>
          </View>
        </TouchableOpacity>
        <Text style={[styles.photoHint, { color: colors.primary }]}>
          {photo || pet?.photo_url ? t('petForm.changePhoto') : t('petForm.addPhoto')}
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('petForm.identity')}</Text>
          {input(t('petForm.name'), name, setName, { placeholder: t('petForm.namePlaceholder') })}

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('petForm.species')}</Text>
          <View style={styles.chips}>
            {SPECIES.map(s =>
              chip(
                t(`petForm.${s}`),
                s === 'other' ? !isKnownSpecies : species.includes(s),
                () => setSpecies(s)
              )
            )}
          </View>
          {!isKnownSpecies &&
            input(t('petForm.otherSpecies'), species === 'other' ? '' : species, v => setSpecies(v.toLowerCase() || 'other'), {
              placeholder: t('petForm.otherSpeciesPlaceholder'),
            })}

          {input(t('petForm.breed'), breed, setBreed, { placeholder: t('petForm.breedPlaceholder') })}

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('petForm.gender')}</Text>
          <View style={styles.chips}>
            {chip(`♂ ${t('petForm.male')}`, gender === 'M', () => setGender('M'))}
            {chip(`♀ ${t('petForm.female')}`, gender === 'F', () => setGender('F'))}
          </View>

          {input(t('petForm.birthday'), birthday, setBirthday, { placeholder: t('petForm.birthdayPlaceholder') })}
          {input(t('petForm.color'), color, setColor)}
          {input(t('petForm.marks'), marks, setMarks, { placeholder: t('petForm.marksPlaceholder'), multiline: true })}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('petForm.identification')}</Text>
          {input(t('petForm.microchip'), microchip, setMicrochip, { keyboard: 'number-pad' })}
          {input(t('petForm.tattoo'), tattoo, setTattoo, { placeholder: t('petForm.ifApplicable') })}
          {input(t('petForm.registration'), registration, setRegistration)}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('petForm.owner')}</Text>
          {input(t('petForm.ownerName'), ownerName, setOwnerName)}
          {input(t('petForm.ownerPhone'), ownerPhone, setOwnerPhone, { keyboard: 'phone-pad' })}
          {input(t('petForm.ownerEmail'), ownerEmail, setOwnerEmail, { keyboard: 'email-address' })}
          {input(t('petForm.ownerAddress'), ownerAddress, setOwnerAddress, { multiline: true })}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('petForm.health')}</Text>
          <View style={styles.row}>
            <View style={styles.flex}>{input(t('petForm.age'), age, setAge, { keyboard: 'number-pad' })}</View>
            <View style={styles.flex}>{input(t('petForm.weight'), weight, setWeight, { keyboard: 'decimal-pad' })}</View>
          </View>
          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>{t('petForm.sterilized')}</Text>
            <Switch
              value={sterilized}
              onValueChange={setSterilized}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
          {input(t('petForm.allergies'), allergies, setAllergies, { placeholder: t('petForm.allergiesPlaceholder') })}
          {input(t('petForm.notes'), notes, setNotes, { placeholder: t('petForm.notesPlaceholder'), multiline: true })}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={save}
          disabled={saving}
        >
          {saving && <ActivityIndicator color="#FFFFFF" />}
          <Text style={styles.saveText}>{saving ? t('petForm.saving') : t('petForm.save')}</Text>
        </TouchableOpacity>

        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  photoWrap: { alignSelf: 'center', marginTop: 8 },
  photo: { width: 112, height: 112, borderRadius: 56 },
  photoBadge: { position: 'absolute', right: 0, bottom: 0, width: 36, height: 36, borderRadius: 18, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  photoBadgeText: { fontSize: 15 },
  photoHint: { textAlign: 'center', fontSize: 13, fontWeight: '600', marginTop: 10, marginBottom: 20 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  field: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  switchLabel: { fontSize: 15, fontWeight: '600' },
  saveBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
