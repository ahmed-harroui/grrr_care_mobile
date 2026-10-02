import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { getDailyStreak, type DailyStreak } from '@/lib/rewards';
import { openDailyGifts } from '@/lib/daily-gifts';

// Care+, the subscription. Payment is not open yet: the card says so plainly and points to the
// one way to get it today, day 7 of the weekly gifts chain (a month of the AI assistant without
// the daily limit, once per account). It adapts to where the account stands:
//   - a won month still running: shows until when;
//   - otherwise: the chain's progress and a button to it (while the free month is still to win);
//   - in the chat, once the daily limit is hit: why, and the same way out.

const NAVY = '#0B1B3F';
const BLUE = '#2563EB';
const SKY = '#7DD3FC';
const ORANGE = '#FFB35C';
const ORANGE_DARK = '#C97A1E';
const AI_LOGO = require('../../assets/images/rewards/care-ai-month.png');

/** The assistant's daily limits (grrr-chat Edge Function). */
const FREE_LIMIT = 30;
const PLUS_LIMIT = 300;

type Variant = 'home' | 'settings' | 'limit';

export function CareSubscription({ variant = 'home' }: { variant?: Variant }) {
  const { user, isDemo } = useAuth();
  const { language } = useLanguage();
  const tx = (en: string, fr: string) => (language === 'fr' ? fr : en);
  const locale = language === 'fr' ? 'fr-FR' : 'en-GB';
  const [streak, setStreak] = useState<DailyStreak | null>(null);
  const [activeUntil, setActiveUntil] = useState<Date | null>(null);
  const [sheet, setSheet] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id || isDemo) return;
      void getDailyStreak().then((result) => {
        setStreak(result);
        const until = result?.careAiUntil ? new Date(result.careAiUntil) : null;
        setActiveUntil(until && until.getTime() > Date.now() ? until : null);
      });
    }, [user?.id, isDemo])
  );

  const done = streak?.done ?? 0;
  // The day shown on the button: today's gift if it still waits, else the last one collected.
  const missionDay = Math.min(streak?.claimedToday ? done : done + 1, 7) || 1;
  const monthToWin = !streak?.aiMonthUsed;
  const untilLabel = activeUntil?.toLocaleDateString(locale, { day: 'numeric', month: 'long' });

  // The sheet is a modal: close it before the gifts chain (another modal) opens.
  const goToMission = () => {
    if (sheet) {
      setSheet(false);
      setTimeout(openDailyGifts, 350);
    } else openDailyGifts();
  };

  const title = activeUntil
    ? tx('Care+ is on', 'Care+ est actif')
    : variant === 'limit'
      ? tx("That's today's limit", 'Limite du jour atteinte')
      : tx('Care+ is coming soon', 'Care+ arrive bientôt');

  const text = activeUntil
    ? tx(`Unlimited assistant until ${untilLabel}, won with the weekly mission.`, `Assistant sans limite jusqu'au ${untilLabel}, gagné avec la mission hebdomadaire.`)
    : variant === 'limit'
      ? monthToWin
        ? tx(`Care+ lifts the ${FREE_LIMIT}-message limit. Payment isn't open yet, but day 7 of the weekly mission gives you a month free.`, `Care+ lève la limite de ${FREE_LIMIT} messages. Le paiement n'est pas encore ouvert, mais le jour 7 de la mission hebdomadaire t'offre un mois.`)
        : tx(`Care+ will lift the ${FREE_LIMIT}-message limit. Payment isn't open yet: see you tomorrow!`, `Care+ lèvera la limite de ${FREE_LIMIT} messages. Le paiement n'est pas encore ouvert : à demain !`)
      : monthToWin
        ? tx('Subscriptions open soon. Meanwhile, finish the weekly mission and get a month free.', "L'abonnement ouvre bientôt. En attendant, termine la mission hebdomadaire et gagne un mois offert.")
        : tx("Your free month is over. Subscriptions open soon; the mission keeps giving treats.", "Ton mois offert est terminé. L'abonnement ouvre bientôt ; la mission continue d'offrir des croquettes.");

  const showMission = !activeUntil && monthToWin && !isDemo;

  return (
    <>
      <Pressable onPress={() => setSheet(true)} style={({ pressed }) => [styles.card, variant === 'limit' && styles.cardLimit, pressed && styles.pressed]}>
        <View style={[styles.glow, styles.glowA]} />
        <View style={[styles.glow, styles.glowB]} />
        <View style={styles.row}>
          <Image source={AI_LOGO} style={styles.logo} contentFit="contain" />
          <View style={styles.flex}>
            <View style={styles.titleRow}>
              <Text style={styles.brand}>CARE+</Text>
              <View style={[styles.pill, activeUntil ? styles.pillOn : styles.pillSoon]}>
                <Text style={[styles.pillText, activeUntil ? styles.pillTextOn : null]}>{activeUntil ? tx('ACTIVE', 'ACTIF') : tx('SOON', 'BIENTÔT')}</Text>
              </View>
            </View>
            <Text style={styles.title}>{title}</Text>
          </View>
        </View>
        <Text style={styles.text}>{text}</Text>

        {showMission && (
          <View style={styles.mission}>
            <View style={styles.track}>
              {Array.from({ length: 7 }, (_, i) => (
                <View key={i} style={[styles.step, i < done && styles.stepDone, i === 6 && styles.stepGoal]} />
              ))}
            </View>
            <Pressable onPress={goToMission} style={({ pressed }) => [styles.missionButton, pressed && styles.pressed]}>
              <Text style={styles.missionText}>{tx(`Weekly mission · day ${missionDay}/7`, `Mission hebdomadaire · jour ${missionDay}/7`)}</Text>
              <Text style={styles.missionArrow}>→</Text>
            </Pressable>
          </View>
        )}
        {variant !== 'limit' && <Text style={styles.more}>{tx('What Care+ includes ›', 'Ce que comprend Care+ ›')}</Text>}
      </Pressable>

      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSheet(false)} />
          <View style={styles.sheet}>
            <View style={[styles.glow, styles.sheetGlow]} />
            <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
              <View style={styles.handle} />
              <Image source={AI_LOGO} style={styles.sheetLogo} contentFit="contain" />
              <Text style={styles.sheetBrand}>GRRR CARE+</Text>
              <Text style={styles.sheetTitle}>{tx('Care without limits', 'Le suivi sans limite')}</Text>

              {[
                ['🤖', tx('Unlimited assistant', 'Assistant sans limite'), tx(`Up to ${PLUS_LIMIT} questions a day instead of ${FREE_LIMIT}.`, `Jusqu'à ${PLUS_LIMIT} questions par jour au lieu de ${FREE_LIMIT}.`)],
                ['🐾', tx('One account, two apps', 'Un compte, deux apps'), tx('Your Care+ follows you in GRRRR too.', 'Ton Care+ te suit aussi dans GRRRR.')],
                ['✨', tx('New features first', 'Les nouveautés en premier'), tx('Members try what comes next before everyone.', 'Les membres testent les nouveautés avant tout le monde.')],
              ].map(([icon, head, body]) => (
                <View key={head} style={styles.feature}>
                  <Text style={styles.featureIcon}>{icon}</Text>
                  <View style={styles.flex}>
                    <Text style={styles.featureTitle}>{head}</Text>
                    <Text style={styles.featureText}>{body}</Text>
                  </View>
                </View>
              ))}

              <View style={styles.soon}>
                <Text style={styles.soonTitle}>{activeUntil ? tx(`Active until ${untilLabel}`, `Actif jusqu'au ${untilLabel}`) : tx('Subscription not available yet', 'Abonnement pas encore disponible')}</Text>
                <Text style={styles.soonText}>{tx('Payment opens soon. No card is asked for in the meantime.', "Le paiement ouvre bientôt. Aucune carte n'est demandée en attendant.")}</Text>
              </View>

              {showMission ? (
                <Pressable onPress={goToMission} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
                  <Text style={styles.ctaText}>{tx('Win a free month with the weekly mission', 'Gagner 1 mois offert avec la mission')}</Text>
                </Pressable>
              ) : (
                <View style={[styles.cta, styles.ctaOff]}>
                  <Text style={[styles.ctaText, styles.ctaTextOff]}>{tx('Coming soon', 'Bientôt disponible')}</Text>
                </View>
              )}
              <Pressable style={styles.close} onPress={() => setSheet(false)}>
                <Text style={styles.closeText}>{tx('Close', 'Fermer')}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  card: { overflow: 'hidden', padding: 18, borderRadius: 24, backgroundColor: NAVY, experimental_backgroundImage: `linear-gradient(135deg, ${NAVY}, #1E3A8A)`, shadowColor: NAVY, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  cardLimit: { marginTop: 4 },
  glow: { position: 'absolute', borderRadius: 999 },
  glowA: { width: 180, height: 180, top: -80, right: -50, backgroundColor: SKY, opacity: 0.18 },
  glowB: { width: 140, height: 140, bottom: -70, left: -40, backgroundColor: ORANGE, opacity: 0.16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 48, height: 48 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brand: { fontSize: 11, fontWeight: '900', letterSpacing: 1.6, color: SKY },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  pillSoon: { backgroundColor: 'rgba(255,179,92,0.22)' },
  pillOn: { backgroundColor: '#10B981' },
  pillText: { fontSize: 9, fontWeight: '900', letterSpacing: 1, color: ORANGE },
  pillTextOn: { color: '#FFFFFF' },
  title: { fontSize: 19, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  text: { fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.78)', marginTop: 10 },
  mission: { marginTop: 14, gap: 10 },
  track: { flexDirection: 'row', gap: 5 },
  step: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.16)' },
  stepDone: { backgroundColor: ORANGE },
  stepGoal: { borderWidth: 1, borderColor: ORANGE },
  missionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999, backgroundColor: ORANGE },
  missionText: { fontSize: 13, fontWeight: '800', color: '#3A2A18' },
  missionArrow: { fontSize: 16, fontWeight: '800', color: '#3A2A18' },
  more: { fontSize: 12, fontWeight: '700', color: SKY, marginTop: 12 },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.55)' },
  sheet: { maxHeight: '90%', overflow: 'hidden', borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: NAVY },
  sheetGlow: { width: 320, height: 320, top: -160, alignSelf: 'center', backgroundColor: BLUE, opacity: 0.45 },
  sheetContent: { padding: 22, paddingTop: 10, alignItems: 'stretch' },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 14 },
  sheetLogo: { alignSelf: 'center', width: 84, height: 84 },
  sheetBrand: { alignSelf: 'center', fontSize: 12, fontWeight: '900', letterSpacing: 2, color: SKY, marginTop: 8 },
  sheetTitle: { alignSelf: 'center', fontSize: 25, fontWeight: '800', color: '#FFFFFF', marginTop: 2, marginBottom: 16 },
  feature: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 10 },
  featureIcon: { fontSize: 22 },
  featureTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  featureText: { fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.72)', marginTop: 2 },
  soon: { marginTop: 6, padding: 14, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,179,92,0.6)' },
  soonTitle: { fontSize: 14, fontWeight: '800', color: ORANGE },
  soonText: { fontSize: 12, lineHeight: 17, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
  cta: { marginTop: 16, alignItems: 'center', paddingVertical: 15, borderRadius: 999, backgroundColor: ORANGE, shadowColor: ORANGE_DARK, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  ctaOff: { backgroundColor: 'rgba(255,255,255,0.12)', shadowOpacity: 0, elevation: 0 },
  ctaText: { fontSize: 15, fontWeight: '800', color: '#3A2A18' },
  ctaTextOff: { color: 'rgba(255,255,255,0.6)' },
  close: { alignItems: 'center', paddingVertical: 14 },
  closeText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
});
