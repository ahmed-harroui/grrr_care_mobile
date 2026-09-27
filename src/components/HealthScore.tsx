import { StyleSheet, Text, View } from 'react-native';
import type { HealthScoreResult } from '../lib/health-score';

type Lang = 'en' | 'fr';
type Colors = Record<string, string>;

const TEXT = {
  title: { en: 'Health follow-up', fr: 'Suivi santé' },
  good: { en: 'Well followed', fr: 'Bien suivi' },
  attention: { en: 'To keep an eye on', fr: 'À surveiller' },
  action: { en: 'Needs updating', fr: 'À mettre à jour' },
  noData: { en: 'Add vaccines and vet visits to see how well their care is followed.', fr: 'Ajoute ses vaccins et visites pour voir si son suivi est à jour.' },
  insufficient: { en: 'Not enough information yet to compute a score.', fr: 'Pas encore assez d’informations pour calculer un score.' },
  noProfile: { en: 'The follow-up score is not available for this species yet.', fr: 'Le score de suivi n’est pas encore disponible pour cette espèce.' },
  provisional: { en: 'Provisional rules — pending veterinary validation.', fr: 'Règles provisoires, en attente de validation vétérinaire.' },
  lastCheckup: { en: 'LAST CHECK-UP', fr: 'DERNIÈRE VISITE' },
  none: { en: 'None recorded', fr: 'Aucune enregistrée' },
} as const;

const levelColor = (result: HealthScoreResult, colors: Colors) =>
  result.status !== 'ok' ? colors.textTertiary : result.level === 'good' ? colors.success : result.level === 'attention' ? colors.warning : colors.error;

/** Small badge for the pet header. Hidden while there is no score. */
export function HealthBadge({ result, lang, colors }: { result: HealthScoreResult | null; lang: Lang; colors: Colors }) {
  if (!result || result.status !== 'ok') return null;
  return (
    <View style={[styles.badge, { backgroundColor: levelColor(result, colors) }]}>
      <Text style={styles.badgeDot}>●</Text>
      <Text style={styles.badgeLabel}>{TEXT[result.level][lang]}</Text>
    </View>
  );
}

/** Score bar, the top next steps and the last vet visit. Replaces the hard-coded placeholder. */
export function HealthScoreSection({ result, lastVisit, lang, colors }: { result: HealthScoreResult | null; lastVisit: string | null; lang: Lang; colors: Colors }) {
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
  const message = !result ? null
    : result.status === 'no_data' ? TEXT.noData[lang]
    : result.status === 'insufficient_data' ? TEXT.insufficient[lang]
    : result.status === 'no_profile' ? TEXT.noProfile[lang]
    : null;

  return (
    <>
      <View style={[styles.section, { borderTopColor: colors.border }]}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{TEXT.title[lang]}</Text>
          {result?.status === 'ok' && <Text style={[styles.value, { color: levelColor(result, colors) }]}>{result.score}%</Text>}
        </View>
        {result?.status === 'ok' ? (
          <>
            <View style={[styles.bar, { backgroundColor: colors.backgroundElement }]}>
              <View style={[styles.barFill, { backgroundColor: levelColor(result, colors), width: `${result.score}%` }]} />
            </View>
            {result.nextSteps.map((step, i) => (
              <Text key={i} style={[styles.step, { color: colors.text }]}>→ {step.advice[lang]} <Text style={{ color: colors.textTertiary }}>(+{step.gain})</Text></Text>
            ))}
            {result.profile.status === 'provisional' && <Text style={[styles.note, { color: colors.textTertiary }]}>{TEXT.provisional[lang]}</Text>}
          </>
        ) : (
          message && <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
        )}
      </View>

      <View style={[styles.timeline, { borderTopColor: colors.border }]}>
        <Text style={[styles.timelineLabel, { color: colors.textSecondary }]}>{TEXT.lastCheckup[lang]}</Text>
        <View style={styles.timelineRow}>
          <View style={[styles.dot, { backgroundColor: lastVisit ? colors.secondary : colors.textTertiary }]} />
          <Text style={[styles.timelineDate, { color: colors.text }]}>
            {lastVisit ? new Date(lastVisit).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : TEXT.none[lang]}
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  badge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeDot: { fontSize: 12, color: 'white', fontWeight: '700' },
  badgeLabel: { fontSize: 12, color: 'white', fontWeight: '600' },
  section: { borderTopWidth: 1, paddingTop: 16, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '600' },
  value: { fontSize: 18, fontWeight: '700' },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  barFill: { height: '100%', borderRadius: 3 },
  step: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  note: { fontSize: 11, marginTop: 10, fontStyle: 'italic' },
  message: { fontSize: 13, lineHeight: 19 },
  timeline: { borderTopWidth: 1, paddingTop: 12 },
  timelineLabel: { fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  timelineDate: { fontSize: 13, fontWeight: '600' },
});
