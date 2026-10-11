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
  const { user, isDemo } = useAuth();
  const { selectPet } = usePetSelector();
  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(!isNew);

  // Out of this page: back where I came from, or to my pets when the page was opened by its address
  // (a reload, a link, the address left in the browser by an earlier session): there is nothing to go back to then.
  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/pets');
  };

  useEffect(() => {
    if (isNew) return;
    grrrCareApi
      .getPetById(id)
      .then(found => {
        // Not a pet of this account (another session's address, a demo pet): nothing to show here
        if (!found || (!isDemo && user && found.owner_id && found.owner_id !== user.id)) router.replace('/(tabs)/pets');
        else setPet(found);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew, user?.id]);

  const onSaved = (saved: any) => {
    if (isNew && saved?.id) selectPet(saved.id);
    leave();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={leave} style={styles.backBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Text style={[styles.backText, { color: colors.primary }]}>‹</Text>
          <Text style={[styles.backLabel, { color: colors.primary }]}>{t('common.back')}</Text>
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
  backBtn: { width: 96, flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 34, fontWeight: '400', lineHeight: 36 },
  backLabel: { fontSize: 15, fontWeight: '700' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  documents: { marginTop: 24 },
  documentsHint: { textAlign: 'center', fontSize: 13, marginTop: 20 },
});
