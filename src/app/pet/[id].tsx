import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { usePetSelector } from '../../context/PetSelectorContext';
import { grrrCareApi } from '../../lib/grrrr-care-api';
import { PetForm } from '../../components/PetForm';
import { PetDocuments } from '../../components/PetDocuments';

export default function PetProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { selectPet } = usePetSelector();
  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (isNew) return;
    grrrCareApi
      .getPetById(id)
      .then(setPet)
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const onSaved = (saved: any) => {
    if (isNew && saved?.id) selectPet(saved.id);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Text style={[styles.backText, { color: colors.primary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {isNew ? t('petForm.newPet') : pet?.pet_name || t('petForm.editPet')}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {loading || !user ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <PetForm
          key={pet?.id ?? 'new'}
          ownerId={user.id}
          pet={pet}
          onSaved={onSaved}
          footer={
            pet?.id ? (
              <View style={styles.documents}>
                <PetDocuments petId={pet.id} ownerId={user.id} />
              </View>
            ) : (
              <Text style={[styles.documentsHint, { color: colors.textSecondary }]}>{t('documents.saveFirst')}</Text>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  backBtn: { width: 40, alignItems: 'flex-start' },
  backText: { fontSize: 34, fontWeight: '400', lineHeight: 36 },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  documents: { marginTop: 24 },
  documentsHint: { textAlign: 'center', fontSize: 13, marginTop: 20 },
});
