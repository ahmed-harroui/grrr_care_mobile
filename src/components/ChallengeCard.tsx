import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { challengeOfTheDay, challengeText, weekKey } from '../lib/challenges';

// "Today's challenge" on the home screen: a small thing to do with the pet, a new one each day.
// What was done is kept on the device: the challenge of the day, and how many this week.

const storageKey = (petId: string) => `grrrcare.challenges.${petId}`;
type Saved = { week: string; done: string[] };

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
};

export function ChallengeCard({ pet, language, colors }: { pet: { id: string; pet_name: string; species?: string | null }; language: 'en' | 'fr'; colors: any }) {
  const tx = (en: string, fr: string) => (language === 'fr' ? fr : en);
  const [skip, setSkip] = useState(0);
  const [saved, setSaved] = useState<Saved>({ week: weekKey(), done: [] });

  useEffect(() => {
    setSkip(0);
    AsyncStorage.getItem(storageKey(pet.id))
      .then((raw) => {
        const value: Saved | null = raw ? JSON.parse(raw) : null;
        // A new week starts the count again
        setSaved(value && value.week === weekKey() ? value : { week: weekKey(), done: [] });
      })
      .catch(() => {});
  }, [pet.id]);

  const challenge = challengeOfTheDay(pet.species, skip);
  // One challenge counts per day: "<day>|<challenge>"
  const doneToday = saved.done.some((entry) => entry.startsWith(`${todayKey()}|`));
  const count = saved.done.length;

  const markDone = () => {
    if (doneToday) return;
    const next = { week: weekKey(), done: [...saved.done, `${todayKey()}|${challenge.id}`] };
    setSaved(next);
    AsyncStorage.setItem(storageKey(pet.id), JSON.stringify(next)).catch(() => {});
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.head}>
        <Text style={[styles.label, { color: colors.primary }]}>🎯 {tx("TODAY'S CHALLENGE", 'DÉFI DU JOUR')}</Text>
        <Text style={[styles.count, { color: colors.textSecondary }]}>
          {count === 0 ? tx('None yet this week', 'Aucun cette semaine') : tx(`${count} done this week`, `${count} relevé${count > 1 ? 's' : ''} cette semaine`)}
        </Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.icon}>{challenge.icon}</Text>
        <Text style={[styles.text, { color: colors.text }]}>{challengeText(challenge, language, pet.pet_name)}</Text>
      </View>
      {/* The week, a dot a day */}
      <View style={styles.week}>
        {Array.from({ length: 7 }, (_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i < count ? colors.primary : colors.border }]} />
        ))}
      </View>
      {doneToday ? (
        <Text style={[styles.done, { color: colors.success }]}>{tx(`✓ Done! See you tomorrow for the next one, ${pet.pet_name} 🐾`, `✓ Relevé ! À demain pour le suivant, ${pet.pet_name} 🐾`)}</Text>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity onPress={markDone} activeOpacity={0.85} style={[styles.primary, { backgroundColor: colors.primary }]}>
            <Text style={styles.primaryText}>✓ {tx('Done', 'Fait')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSkip(skip + 1)} activeOpacity={0.85} style={[styles.secondary, { borderColor: colors.border }]}>
            <Text style={[styles.secondaryText, { color: colors.text }]}>↻ {tx('Another one', 'Un autre')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, borderWidth: 1, padding: 16, gap: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  count: { fontSize: 12, fontWeight: '600' },
  body: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 34 },
  text: { flex: 1, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  week: { flexDirection: 'row', gap: 6 },
  dot: { flex: 1, height: 6, borderRadius: 3 },
  actions: { flexDirection: 'row', gap: 10 },
  primary: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  secondary: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1 },
  secondaryText: { fontSize: 14, fontWeight: '700' },
  done: { fontSize: 14, fontWeight: '700' },
});
