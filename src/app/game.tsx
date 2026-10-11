import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { usePetSelector } from '@/context/PetSelectorContext';
import { grrrCareApi } from '@/lib/grrrr-care-api';
import { getPetHealthScore } from '@/lib/health-score';
import { birthDate } from '@/lib/care-plan';
import { getDailyStreak } from '@/lib/rewards';
import { GameView } from '@/components/GameView';
import type { GameKind, GameViewProps } from '@/components/game-url';

const STORE_URL = 'https://store.greatrascals.com/';
const SKY = '#5fbcff';
const INK = '#0f1b3d';

// The animals of the game's planet, the species of the account's pets that take their place, and
// the age (years) from which one is a senior
const KINDS: [GameKind, RegExp, number][] = [['cat', /cat|chat/i, 10], ['dog', /dog|chien/i, 8], ['parrot', /parrot|perroquet|perruche|bird|oiseau/i, 99], ['rabbit', /rabbit|lapin/i, 5]];

/**
 * The game "help your pets": 90 seconds on a small planet, with the player's own animals (a dog
 * and a cat at home: a dog and a cat in the game) and the worries of their species and age.
 * Finishing a game is what unlocks day 7 of the weekly gifts. The game never navigates itself:
 * its links to the rest of Care are opened from here.
 */
export default function GameScreen() {
  const { user, isDemo } = useAuth();
  const { language } = useLanguage();
  const { selectedPetId } = usePetSelector();
  const tx = (en: string, fr: string) => (language === 'fr' ? fr : en);
  const [setup, setSetup] = useState<{ names: GameViewProps['names']; stages: NonNullable<GameViewProps['stages']>; health: number | null } | null>(null);
  // Whether a game of this week already counts for the gift
  const [counted, setCounted] = useState(false);
  const [justWon, setJustWon] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const pets: any[] = await grrrCareApi.getPets(user?.id).catch(() => []);
      const names: GameViewProps['names'] = {};
      const stages: NonNullable<GameViewProps['stages']> = {};
      const followed = pets.find(p => p.id === selectedPetId) ?? pets[0];
      for (const [kind, species, seniorFrom] of KINDS) {
        // Two dogs at home: the one followed in the app plays
        const pet = [followed, ...pets].find(p => p && species.test(String(p.species)));
        if (!pet?.pet_name) continue;
        names[kind] = pet.pet_name;
        const born = birthDate(pet);
        const years = born ? (Date.now() - born.getTime()) / (365.25 * 864e5) : null;
        if (years != null && years < 1) stages[kind] = 'young';
        else if (years != null && years >= seniorFrom) stages[kind] = 'senior';
      }
      const score = followed ? await getPetHealthScore(followed).catch(() => null) : null;
      const streak = isDemo ? null : await getDailyStreak();
      if (!active) return;
      setCounted(!!streak?.gamePlayed);
      setSetup({ names, stages, health: score?.status === 'ok' ? score.score : null });
    })();
    return () => {
      active = false;
    };
  }, [user?.id, selectedPetId, isDemo]);

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  const onEvent = useCallback((type: string, payload: any) => {
    if (type === 'end') {
      void grrrCareApi.recordGame(payload).then(done => {
        if (done) {
          setJustWon(!counted);
          setCounted(true);
        }
      });
    }
    if (type === 'cta') {
      const target = payload?.target;
      if (target === 'store') void WebBrowser.openBrowserAsync(STORE_URL);
      else if (target === 'reminder') router.replace({ pathname: '/(tabs)/health', params: { add: 'reminder' } });
      else if (target === 'health') router.replace('/(tabs)/health');
      else if (target === 'vet') router.replace('/(tabs)/findvet');
      else router.replace('/(tabs)/chat');
    }
  }, [counted]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bar}>
        <TouchableOpacity onPress={leave} style={styles.back} accessibilityRole="button" accessibilityLabel={tx('Back', 'Retour')}>
          <Text style={styles.backText}>‹ {tx('Back', 'Retour')}</Text>
        </TouchableOpacity>
        <Text style={styles.status} numberOfLines={2}>
          {isDemo
            ? tx('Demo: sign in for the game to count', 'Démo : connecte-toi pour que la partie compte')
            : justWon
              ? tx("🎉 Game finished: the week's gift is unlocked", '🎉 Partie finie : le cadeau de la semaine est débloqué')
              : counted
                ? tx("✓ This week's game is done", '✓ Jeu de la semaine fait')
                : tx("Finish a game to unlock the week's gift (day 7)", 'Finis une partie pour débloquer le cadeau de la semaine (jour 7)')}
        </Text>
      </View>
      {setup ? (
        <GameView language={language === 'fr' ? 'fr' : 'en'} names={setup.names} stages={setup.stages} health={setup.health} onEvent={onEvent} />
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color="#FFFFFF" size="large" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SKY },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  back: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#EEF4FF' },
  backText: { fontSize: 14, fontWeight: '800', color: INK },
  status: { flex: 1, fontSize: 13, fontWeight: '700', color: INK, textAlign: 'right' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
