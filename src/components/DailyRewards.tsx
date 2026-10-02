import React, { useCallback, useEffect, useState } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { usePetSelector } from '@/context/PetSelectorContext';
import { claimDailyReward, DailyReward, DailyStreak, getDailyStreak, weekFor } from '@/lib/rewards';

// The daily gifts, as in the GRRRR app (same streak): a chain button in the header opens the
// week's chain, in GRRRR Adopt's look (white glass, warm orange). Day 7: a month of the AI
// assistant without the daily limit.
const ORANGE = '#FFB35C';
const ORANGE_DARK = '#C97A1E';
const INK = '#3A2A18';
const INK_SOFT = '#8A6F54';
const GLASS = 'rgba(255,255,255,0.68)';
const GLASS_BORDER = 'rgba(255,255,255,0.95)';
const CARE_AI_LOGO = require('../../assets/images/rewards/care-ai-month.png');

type Tx = (en: string, fr: string) => string;

function rewardLabel(reward: DailyReward, tx: Tx) {
  if (reward.kind === 'treats') return tx(`${reward.amount} treat${reward.amount > 1 ? 's' : ''}`, `${reward.amount} croquette${reward.amount > 1 ? 's' : ''}`);
  if (reward.kind === 'voucher') return tx('Shop gift', 'Cadeau boutique');
  return tx('1 month AI', '1 mois IA');
}

function RewardIcon({ reward, size }: { reward: DailyReward; size: number }) {
  if (reward.kind === 'care_ai') return <Image source={CARE_AI_LOGO} style={{ width: size * 1.5, height: size * 1.5 }} resizeMode="contain" />;
  return <Text style={{ fontSize: size }}>{reward.kind === 'voucher' ? '🎁' : '🦴'}</Text>;
}

export function DailyRewards() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { selectedPetId } = usePetSelector();
  const tx: Tx = (en, fr) => (language === 'fr' ? fr : en);
  const locale = language === 'fr' ? 'fr-FR' : 'en-GB';
  const [streak, setStreak] = useState<DailyStreak | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState<(DailyReward & { day: number }) | null>(null);
  const [failed, setFailed] = useState(false);

  // The AI month still running, worked out when the streak is read (not while drawing).
  const [aiUntil, setAiUntil] = useState<Date | null>(null);
  const load = useCallback(() => {
    if (!user?.id) return;
    void getDailyStreak().then((result) => {
      setStreak(result);
      const until = result?.careAiUntil ? new Date(result.careAiUntil) : null;
      setAiUntil(until && until.getTime() > Date.now() ? until : null);
    });
  }, [user?.id]);
  useFocusEffect(load);

  // The button breathes while today's gift waits.
  const [pulse] = useState(() => new Animated.Value(1));
  const claimable = Boolean(streak && !streak.claimedToday);
  useEffect(() => {
    if (!claimable) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.12, duration: 650, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [claimable, pulse]);

  if (!user?.id) return null;

  const claim = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const result = await claimDailyReward(selectedPetId);
    setBusy(false);
    if (result.reward) setWon(result.reward);
    else if (result.error !== 'ALREADY_CLAIMED') setFailed(true);
    load();
  };

  const day = streak?.day ?? 1;
  const week = weekFor(streak?.aiMonthUsed);
  const done = streak?.done ?? 0;

  return (
    <>
      <Animated.View style={{ transform: [{ scale: claimable ? pulse : 1 }] }}>
        <Pressable style={[styles.button, claimable && styles.buttonReady]} onPress={() => { setWon(null); setOpen(true); }} hitSlop={4} accessibilityLabel={tx('Daily gifts', 'Cadeaux du jour')}>
          <Text style={styles.buttonIcon}>🔗</Text>
          {streak && <Text style={styles.buttonDay}>{streak.claimedToday ? day : done}</Text>}
          {claimable && <View style={styles.buttonDot} />}
        </Pressable>
      </Animated.View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            {/* Warm light behind the glass */}
            <View style={[styles.glow, styles.glowTop]} />
            <View style={[styles.glow, styles.glowBottom]} />
            <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
              <View style={styles.handle} />
              <Text style={styles.eyebrow}>GRRR CARE · {tx('DAILY GIFTS', 'CADEAUX DU JOUR')}</Text>
              <Text style={styles.title}>{tx("Your week's chain", 'Ta chaîne de la semaine')}</Text>
              <Text style={styles.subtitle}>{tx('One gift a day, bigger and bigger. Miss a day and the chain starts again at day 1.', 'Un cadeau par jour, de plus en plus gros. Rate un jour et la chaîne reprend au jour 1.')}</Text>

              <View style={styles.chain}>
                {week.map((reward, index) => {
                  const n = index + 1;
                  const isDone = n <= done;
                  const isToday = !streak?.claimedToday && n === day;
                  const big = n === 7;
                  return (
                    <View key={n} style={[styles.linkWrap, big && styles.linkWrapBig]}>
                      {index > 0 && index !== 4 && <View style={[styles.connector, n <= done + (isToday ? 1 : 0) && styles.connectorDone]} />}
                      <View style={[styles.link, big && styles.linkBig, isDone && styles.linkDone, isToday && styles.linkToday]}>
                        <RewardIcon reward={reward} size={big ? 26 : 20} />
                        {isDone && <Text style={styles.check}>✓</Text>}
                      </View>
                      <Text style={[styles.linkDay, isToday && styles.linkDayToday]}>{tx(`Day ${n}`, `Jour ${n}`)}</Text>
                      <Text style={styles.linkLabel} numberOfLines={2}>{rewardLabel(reward, tx)}</Text>
                    </View>
                  );
                })}
              </View>

              {won ? (
                <View style={styles.wonCard}>
                  <View style={styles.wonIcon}><RewardIcon reward={won} size={34} /></View>
                  <Text style={styles.wonTitle}>{tx(`Day ${won.day} collected! 🎉`, `Jour ${won.day} récupéré ! 🎉`)}</Text>
                  <Text style={styles.wonText}>
                    {won.kind === 'treats'
                      ? tx(`+${won.amount} treat${won.amount > 1 ? 's' : ''} for ${won.petName ?? 'your companion'} in GRRRR.`, `+${won.amount} croquette${won.amount > 1 ? 's' : ''} pour ${won.petName ?? 'ton compagnon'} dans GRRRR.`)
                      : won.kind === 'voucher'
                        ? tx('Your GRRRR Shop gift voucher (keep it safe):', 'Ton bon cadeau pour la boutique GRRRR (garde-le précieusement) :')
                        : tx(`The AI assistant is unlimited until ${won.until ? new Date(won.until).toLocaleDateString(locale, { day: 'numeric', month: 'long' }) : 'next month'}.`, `L'assistant IA est illimité jusqu'au ${won.until ? new Date(won.until).toLocaleDateString(locale, { day: 'numeric', month: 'long' }) : 'mois prochain'}.`)}
                  </Text>
                  {won.kind === 'voucher' && won.code && <Text selectable style={styles.code}>{won.code}</Text>}
                  <Text style={styles.wonNext}>{tx('Come back tomorrow for the next one 🔗', 'Reviens demain pour le suivant 🔗')}</Text>
                </View>
              ) : streak?.claimedToday ? (
                <View style={styles.wonCard}>
                  <Text style={styles.wonTitle}>{tx("Today's gift collected ✓", 'Cadeau du jour récupéré ✓')}</Text>
                  <Text style={styles.wonText}>{day >= 7 ? tx('Week complete! A new chain starts tomorrow.', 'Semaine complète ! Demain, une nouvelle chaîne commence.') : tx(`Tomorrow: ${rewardLabel(week[day], tx)}. Don't break the chain!`, `Demain : ${rewardLabel(week[day], tx)}. Ne casse pas la chaîne !`)}</Text>
                </View>
              ) : (
                <Pressable style={[styles.claim, busy && styles.claimBusy]} onPress={claim} disabled={busy || !streak}>
                  <Text style={styles.claimText}>{busy ? tx('Opening…', 'Ouverture…') : tx(`Collect day ${day}'s gift`, `Récupérer le cadeau du jour ${day}`)}</Text>
                </Pressable>
              )}
              {failed && <Text style={styles.error}>{tx('The gift could not be collected. Try again in a moment.', "Le cadeau n'a pas pu être récupéré. Réessaie dans un instant.")}</Text>}

              {aiUntil && (
                <View style={styles.aiBadge}>
                  <Image source={CARE_AI_LOGO} style={styles.aiLogo} resizeMode="contain" />
                  <Text style={styles.aiText}>{tx(`Unlimited AI assistant until ${aiUntil.toLocaleDateString(locale, { day: 'numeric', month: 'long' })}`, `Assistant IA illimité jusqu'au ${aiUntil.toLocaleDateString(locale, { day: 'numeric', month: 'long' })}`)}</Text>
                </View>
              )}
              <Text style={styles.footnote}>{tx(`Best streak: ${streak?.best ?? 0} days · also in the GRRRR app`, `Meilleure série : ${streak?.best ?? 0} jours · aussi dans l'app GRRRR`)}</Text>
              <Pressable style={styles.close} onPress={() => setOpen(false)}><Text style={styles.closeText}>{tx('Close', 'Fermer')}</Text></Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1.5, borderColor: 'rgba(255,179,92,0.6)', alignItems: 'center', justifyContent: 'center' },
  buttonReady: { backgroundColor: ORANGE, borderColor: '#FFFFFF', shadowColor: ORANGE_DARK, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  buttonIcon: { fontSize: 15 },
  buttonDay: { position: 'absolute', bottom: -4, right: -4, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: ORANGE_DARK, color: '#FFFFFF', fontWeight: '800', fontSize: 10, textAlign: 'center', lineHeight: 17, overflow: 'hidden' },
  buttonDot: { position: 'absolute', top: -2, right: -2, width: 11, height: 11, borderRadius: 6, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#FFFFFF' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: { maxHeight: '90%', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden', backgroundColor: '#FFF4E6' },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 26, paddingTop: 10 },
  glow: { position: 'absolute', borderRadius: 999, backgroundColor: ORANGE },
  glowTop: { width: 240, height: 240, top: -90, right: -80, opacity: 0.35 },
  glowBottom: { width: 300, height: 300, bottom: -140, left: -110, opacity: 0.4 },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: 'rgba(201,122,30,0.35)', marginBottom: 14 },
  eyebrow: { fontWeight: '800', fontSize: 10, letterSpacing: 1.2, color: ORANGE_DARK },
  title: { fontWeight: '800', fontSize: 24, color: INK, marginTop: 2 },
  subtitle: { fontSize: 13, lineHeight: 18, color: INK_SOFT, marginTop: 4 },
  chain: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: 14, marginTop: 18, padding: 12, borderRadius: 24, backgroundColor: GLASS, borderWidth: 1.5, borderColor: GLASS_BORDER },
  linkWrap: { width: '25%', alignItems: 'center' },
  linkWrapBig: { width: '50%' },
  connector: { position: 'absolute', top: 26, right: '62%', width: '76%', height: 4, borderRadius: 2, backgroundColor: 'rgba(201,122,30,0.18)' },
  connectorDone: { backgroundColor: ORANGE },
  link: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 2, borderColor: 'rgba(255,179,92,0.45)' },
  linkBig: { width: 74, height: 74, borderRadius: 37, borderColor: ORANGE, borderWidth: 3 },
  linkDone: { backgroundColor: ORANGE, borderColor: '#FFFFFF' },
  linkToday: { borderColor: ORANGE_DARK, borderWidth: 3, backgroundColor: '#FFFFFF', shadowColor: ORANGE_DARK, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  check: { position: 'absolute', bottom: -3, right: -3, width: 19, height: 19, borderRadius: 10, backgroundColor: '#FFFFFF', color: ORANGE_DARK, fontWeight: '800', fontSize: 12, textAlign: 'center', lineHeight: 19, overflow: 'hidden' },
  linkDay: { fontWeight: '800', fontSize: 11, color: INK, marginTop: 5 },
  linkDayToday: { color: ORANGE_DARK },
  linkLabel: { fontSize: 10, color: INK_SOFT, textAlign: 'center', paddingHorizontal: 2 },
  claim: { marginTop: 18, alignItems: 'center', paddingVertical: 15, borderRadius: 999, backgroundColor: ORANGE, borderWidth: 1.5, borderColor: '#FFFFFF', shadowColor: ORANGE_DARK, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  claimBusy: { opacity: 0.6 },
  claimText: { fontWeight: '800', fontSize: 15, color: '#FFFFFF' },
  error: { fontWeight: '600', fontSize: 12, color: '#EF4444', textAlign: 'center', marginTop: 8 },
  wonCard: { marginTop: 18, alignItems: 'center', padding: 16, borderRadius: 22, backgroundColor: GLASS, borderWidth: 1.5, borderColor: GLASS_BORDER },
  wonIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: ORANGE, marginBottom: 8 },
  wonTitle: { fontWeight: '800', fontSize: 19, color: INK, textAlign: 'center' },
  wonText: { fontSize: 13, lineHeight: 19, color: INK_SOFT, textAlign: 'center', marginTop: 4 },
  code: { fontWeight: '900', fontSize: 22, letterSpacing: 2, color: ORANGE_DARK, marginTop: 8, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  wonNext: { fontWeight: '600', fontSize: 12, color: ORANGE_DARK, marginTop: 10 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 10, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: GLASS_BORDER },
  aiLogo: { width: 40, height: 40 },
  aiText: { flex: 1, fontWeight: '600', fontSize: 12, color: INK },
  footnote: { fontSize: 11, color: INK_SOFT, textAlign: 'center', marginTop: 14 },
  close: { alignItems: 'center', paddingVertical: 12 },
  closeText: { fontWeight: '600', fontSize: 13, color: INK_SOFT },
});
