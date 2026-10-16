import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, TextInput, Alert, Platform, SafeAreaView } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useDevice } from '../lib/device';
import { usePetSelector } from '../context/PetSelectorContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { grrrCareApi } from '../lib/grrrr-care-api';
import { addDays, birthDate, daysUntil, isoDay, nextDoseAfter, PLAN_ICON, suggestPlan, vaccineNames, type PlanItem } from '../lib/care-plan';
import { AppHeader } from '../components/AppHeader';
import { DateField } from '../components/DateField';

type Tab = 'vaccines' | 'meds' | 'visits';
/** What the add sheet is filling in: a record of one of the tabs, or a reminder of the plan */
type FormKind = Tab | 'reminder';

// How often a treatment is given: [key, English, French, every… days]
const FREQUENCIES: [string, string, string, number][] = [
  ['daily', 'Once a day', '1 fois par jour', 1],
  ['twice', 'Twice a day', '2 fois par jour', 1],
  ['weekly', 'Once a week', '1 fois par semaine', 7],
  ['monthly', 'Once a month', '1 fois par mois', 30],
];
// How long a treatment lasts: [days (0: no end), English, French]
const DURATIONS: [number, string, string][] = [[5, '5 days', '5 jours'], [7, '7 days', '7 jours'], [10, '10 days', '10 jours'], [30, '1 month', '1 mois'], [0, 'Ongoing', 'En continu']];
// The next dose of a vaccine: [key, English, French, days (0: none, -1: the usual interval of this vaccine)]
const NEXT_DOSES: [string, string, string, number][] = [['usual', 'In 1 year', 'Dans 1 an', -1], ['month', 'In 1 month', 'Dans 1 mois', 30], ['three', 'In 3 years', 'Dans 3 ans', 1095], ['none', 'None', 'Aucun', 0]];
// A reminder of the plan comes back: [days (0: once), English, French]
const REPEATS: [number, string, string][] = [[0, 'Once', 'Une fois'], [30, 'Every month', 'Chaque mois'], [91, 'Every 3 months', 'Tous les 3 mois'], [365, 'Every year', 'Chaque année']];

const emptyForm = () => ({ name: '', date: new Date(), nextDose: 'usual', vet: '', dosage: '', frequency: 'daily', duration: 7, reason: '', repeat: 0 });

/** One line of "Coming up": a plan item, the next dose of a vaccine, or a vet appointment */
interface Upcoming {
  key: string;
  icon: string;
  title: string;
  /** ISO date or date-time */
  date: string;
  days: number;
  time?: string;
  plan?: PlanItem;
  /** A vaccine of the record whose next dose is this line */
  vaccine?: string;
}

export function HealthScreen() {
  const { selectedPetId } = usePetSelector();
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { medium } = useDevice();
  const router = useRouter();
  const params = useLocalSearchParams<{ add?: string }>();
  const tx = (en: string, fr: string) => (language === 'fr' ? fr : en);
  const locale = language === 'fr' ? 'fr-FR' : 'en-GB';
  const [pet, setPet] = useState<any>(null);
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [vetVisits, setVetVisits] = useState<any[]>([]);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('vaccines');
  const [formKind, setFormKind] = useState<FormKind | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState(false);
  // What just happened, said in one line under the wand ("5 dates added")
  const [notice, setNotice] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!selectedPetId) return;
    try {
      if (!quiet) setLoading(true);
      const [petData, vacs, meds, visits, planItems] = await Promise.all([
        grrrCareApi.getPetById(selectedPetId),
        grrrCareApi.getVaccinations(selectedPetId),
        grrrCareApi.getMedications(selectedPetId),
        grrrCareApi.getVetVisits(selectedPetId),
        grrrCareApi.getCarePlan(selectedPetId),
      ]);
      setPet(petData);
      setVaccinations(vacs);
      setMedications(meds);
      setVetVisits(visits);
      setPlan(planItems);
    } catch (error) {
      console.error('Error loading health data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPetId]);

  useFocusEffect(useCallback(() => {
    setNotice(null);
    void load();
  }, [load]));

  const openForm = (kind: FormKind, preset: Partial<ReturnType<typeof emptyForm>> = {}) => {
    setForm({ ...emptyForm(), ...preset });
    setFormKind(kind);
  };

  // Opened from elsewhere with something to add (the game's "create a reminder")
  useEffect(() => {
    const add = params.add;
    if (add === 'reminder') openForm('reminder');
    if (add === 'vaccines' || add === 'meds' || add === 'visits') {
      setActiveTab(add);
      openForm(add, add === 'visits' ? { date: addDays(new Date(new Date().setHours(10, 0, 0, 0)), 1) } : {});
    }
    if (add) router.setParams({ add: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.add]);

  const fail = (message: string) => (Platform.OS === 'web' ? window.alert(message) : Alert.alert(message));
  const confirm = (message: string, onYes: () => void) => {
    if (Platform.OS === 'web') {
      if (window.confirm(message)) onYes();
      return;
    }
    Alert.alert(message, undefined, [{ text: tx('Cancel', 'Annuler'), style: 'cancel' }, { text: tx('Delete', 'Supprimer'), style: 'destructive', onPress: onYes }]);
  };
  const day = (value: string | Date) => new Date(value).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

  const nextDoseDate = (name: string, date: Date, key: string): Date | null => {
    const days = NEXT_DOSES.find(option => option[0] === key)?.[3] ?? -1;
    if (days === 0) return null;
    return days === -1 ? nextDoseAfter(pet?.species, name, date) : addDays(date, days);
  };

  const save = async () => {
    if (!formKind || !selectedPetId || saving) return;
    const name = form.name.trim();
    if (formKind !== 'visits' && !name) return fail(tx('Give it a name first.', "Donne-lui d'abord un nom."));
    setSaving(true);
    try {
      if (formKind === 'vaccines') {
        const next = nextDoseDate(name, form.date, form.nextDose);
        await grrrCareApi.addVaccination(selectedPetId, { name, date: form.date.toISOString(), nextDue: next ? next.toISOString() : null, vetName: form.vet.trim() });
        // The dose that was planned for it is done
        const planned = plan.find(item => item.kind === 'vaccine' && !item.done_at && item.title.toLowerCase().startsWith(name.toLowerCase()) && daysUntil(item.due_date) <= 30);
        if (planned) await grrrCareApi.deletePlanItem(planned.id);
      } else if (formKind === 'meds') {
        const [, en, fr, everyDays] = FREQUENCIES.find(option => option[0] === form.frequency) ?? FREQUENCIES[0];
        await grrrCareApi.addMedication(selectedPetId, {
          name,
          dosage: form.dosage.trim(),
          frequency: tx(en, fr),
          startDate: form.date.toISOString(),
          endDate: form.duration ? addDays(form.date, form.duration - 1).toISOString() : null,
          everyDays,
        });
      } else if (formKind === 'visits') {
        await grrrCareApi.addVetVisit(selectedPetId, { date: form.date.toISOString(), vetName: form.vet.trim(), reason: form.reason.trim() });
      } else {
        await grrrCareApi.addPlanItem(selectedPetId, { kind: 'other', title: name, title_en: name, due_date: isoDay(form.date), repeat_days: form.repeat || null, source: 'manual', plan_key: null });
      }
      setFormKind(null);
      setNotice(tx('Saved. The reminders follow on their own.', 'Enregistré. Les rappels suivent tout seuls.'));
      await load(true);
    } catch (error: any) {
      fail(tx('It could not be saved: ', "L'enregistrement a échoué : ") + (error?.message ?? ''));
    } finally {
      setSaving(false);
    }
  };

  // The magic wand: the next dates for this pet, from its species, its age and its record
  const generate = async () => {
    if (!pet || !selectedPetId || working) return;
    setWorking(true);
    try {
      const items = suggestPlan(pet, { vaccinations, vetVisits, plan });
      await grrrCareApi.replaceGeneratedPlan(selectedPetId, items);
      await load(true);
      setShowAll(true);
      const precise = birthDate(pet) ? '' : tx(' Add the birth date to the profile for more exact dates.', ' Ajoute la date de naissance au profil pour des dates plus justes.');
      setNotice(items.length
        ? tx(`${items.length} date${items.length > 1 ? 's' : ''} planned for ${pet.pet_name}.`, `${items.length} date${items.length > 1 ? 's' : ''} prévue${items.length > 1 ? 's' : ''} pour ${pet.pet_name}.`) + precise
        : tx('Everything is already followed in the record.', 'Tout est déjà suivi dans le carnet.'));
    } catch (error: any) {
      fail(tx('The dates could not be planned: ', "Les dates n'ont pas pu être prévues : ") + (error?.message ?? ''));
    } finally {
      setWorking(false);
    }
  };

  const markDone = async (item: PlanItem) => {
    if (working) return;
    setWorking(true);
    try {
      // A first dose is followed by the next one of the plan; any other vaccine comes back as usual
      const firstDose = /^vaccine:[a-z]+\d:/.test(item.plan_key ?? '');
      const next = item.kind === 'vaccine' && !firstDose ? nextDoseAfter(pet?.species, item.title, new Date()).toISOString() : null;
      await grrrCareApi.completePlanItem(item, next);
      await load(true);
      setNotice(item.kind === 'vaccine'
        ? tx('Added to the vaccines of the record.', 'Ajouté aux vaccins du carnet.')
        : item.repeat_days ? tx('Done. The next one is planned.', 'Fait. Le prochain est déjà prévu.') : tx('Done.', 'Fait.'));
    } catch (error: any) {
      fail(error?.message ?? 'Error');
    } finally {
      setWorking(false);
    }
  };

  const removePlan = (item: PlanItem) => confirm(tx(`Remove "${item.title_en ?? item.title}" from what is coming?`, `Retirer « ${item.title} » de ce qui est à venir ?`), async () => {
    await grrrCareApi.deletePlanItem(item.id).catch((error: any) => fail(error?.message ?? 'Error'));
    void load(true);
  });

  const removeRecord = (id: string) => confirm(tx('Delete this record?', 'Supprimer cette fiche ?'), async () => {
    try {
      if (activeTab === 'vaccines') await grrrCareApi.deleteVaccination(id);
      else if (activeTab === 'meds') await grrrCareApi.deleteMedication(id);
      else await grrrCareApi.deleteVetVisit(id);
      void load(true);
    } catch (error: any) {
      fail(error?.message ?? 'Error');
    }
  });

  const upcoming = useMemo<Upcoming[]>(() => {
    const now = new Date();
    const lines: Upcoming[] = [];
    for (const item of plan) {
      if (!item.done_at) lines.push({ key: `plan-${item.id}`, icon: PLAN_ICON[item.kind] ?? '📌', title: language === 'fr' ? item.title : item.title_en ?? item.title, date: item.due_date, days: daysUntil(item.due_date, now), plan: item });
    }
    // Vaccines: the next dose of the latest one of each name
    const latest = new Map<string, any>();
    for (const v of vaccinations) {
      const key = String(v.vaccine).toLowerCase();
      if (!latest.has(key) || String(v.date) > String(latest.get(key).date)) latest.set(key, v);
    }
    for (const v of latest.values()) {
      if (v.next_due) lines.push({ key: `vac-${v.id}`, icon: '💉', title: tx(`${v.vaccine}: booster`, `${v.vaccine} : rappel`), date: v.next_due, days: daysUntil(v.next_due, now), vaccine: v.vaccine });
    }
    for (const visit of vetVisits) {
      if (new Date(visit.date).getTime() >= now.getTime()) {
        const at = new Date(visit.date);
        lines.push({ key: `visit-${visit.id}`, icon: '🩺', title: [tx('Vet', 'Vétérinaire'), visit.vet_name, visit.reason].filter(Boolean).join(' · '), date: visit.date, days: daysUntil(visit.date, now), time: `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}` });
      }
    }
    return lines.sort((a, b) => a.days - b.days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, vaccinations, vetVisits, language]);

  const isActive = (med: any) => new Date(med.start_date).getTime() <= Date.now() && (!med.end_date || daysUntil(med.end_date) >= 0);
  const activeMeds = medications.filter(isActive);

  if (!selectedPetId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader colors={colors} />
        <View style={styles.centerContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{tx('Choose a pet to see its health record', 'Choisis un compagnon pour voir son carnet de santé')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tabConfig: Record<Tab, { emoji: string; label: string; add: string; color: string }> = {
    vaccines: { emoji: '💉', label: tx('Vaccines', 'Vaccins'), add: tx('Add a vaccine', 'Ajouter un vaccin'), color: colors.primary },
    meds: { emoji: '💊', label: tx('Treatments', 'Traitements'), add: tx('Add a treatment', 'Ajouter un traitement'), color: colors.accent },
    visits: { emoji: '🩺', label: tx('Vet', 'Vétérinaire'), add: tx('Add a visit or appointment', 'Ajouter une visite ou un rendez-vous'), color: colors.warning },
  };
  const data = activeTab === 'vaccines' ? vaccinations : activeTab === 'meds' ? medications : vetVisits;
  const config = tabConfig[activeTab];
  const when = (days: number) => days < 0 ? tx(`${-days} d late`, `en retard de ${-days} j`) : days === 0 ? tx('today', "aujourd'hui") : days === 1 ? tx('tomorrow', 'demain') : days < 60 ? tx(`in ${days} days`, `dans ${days} j`) : tx(`in ${Math.round(days / 30.4)} months`, `dans ${Math.round(days / 30.4)} mois`);
  const shownUpcoming = showAll ? upcoming : upcoming.slice(0, 4);
  const computedNext = formKind === 'vaccines' ? nextDoseDate(form.name.trim(), form.date, form.nextDose) : null;
  const chip = (selected: boolean) => [styles.chip, { backgroundColor: selected ? colors.primary : colors.backgroundElement, borderColor: selected ? colors.primary : colors.border }];
  const chipText = (selected: boolean) => [styles.chipText, { color: selected ? '#FFFFFF' : colors.text }];
  const input = [styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundElement }];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader colors={colors} />
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={[styles.page, medium]} showsVerticalScrollIndicator={false}>
          <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>{tx('HEALTH RECORD', 'CARNET DE SANTÉ')}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{pet?.pet_name}</Text>

          {/* What is coming, from the record and the plan. Filled in once, the reminders follow on their own. */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{tx('Coming up', 'À venir')}</Text>
              <TouchableOpacity onPress={() => openForm('reminder')} style={[styles.smallButton, { borderColor: colors.border }]} accessibilityLabel={tx('Add a reminder', 'Ajouter un rappel')}>
                <Text style={[styles.smallButtonText, { color: colors.text }]}>＋ {tx('Reminder', 'Rappel')}</Text>
              </TouchableOpacity>
            </View>

            {activeMeds.map(med => (
              <View key={med.id} style={[styles.line, { borderBottomColor: colors.border }]}>
                <Text style={styles.lineIcon}>💊</Text>
                <View style={styles.lineBody}>
                  <Text style={[styles.lineTitle, { color: colors.text }]} numberOfLines={2}>{[med.name, med.dosage, med.frequency].filter(Boolean).join(' · ')}</Text>
                  <Text style={[styles.lineWhen, { color: colors.success }]}>{med.end_date ? tx(`in progress until ${day(med.end_date)}`, `en cours jusqu'au ${day(med.end_date)}`) : tx('in progress', 'en cours')}</Text>
                </View>
              </View>
            ))}

            {shownUpcoming.map(line => (
              <View key={line.key} style={[styles.line, { borderBottomColor: colors.border }]}>
                <Text style={styles.lineIcon}>{line.days < 0 ? '⚠️' : line.icon}</Text>
                <View style={styles.lineBody}>
                  <Text style={[styles.lineTitle, { color: colors.text }]} numberOfLines={2}>{line.title}</Text>
                  <Text style={[styles.lineWhen, { color: line.days < 0 ? colors.error : line.days <= 7 ? colors.warning : colors.textSecondary }]}>
                    {day(line.date)}{line.time ? ` · ${line.time}` : ''} · {when(line.days)}
                  </Text>
                </View>
                {line.plan && (
                  <>
                    <TouchableOpacity onPress={() => markDone(line.plan!)} disabled={working} style={[styles.doneButton, { backgroundColor: colors.success + '22' }]}>
                      <Text style={[styles.doneText, { color: colors.success }]}>✓ {tx('Done', 'Fait')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removePlan(line.plan!)} hitSlop={8} accessibilityLabel={tx('Remove', 'Retirer')}>
                      <Text style={[styles.removeText, { color: colors.textTertiary }]}>✕</Text>
                    </TouchableOpacity>
                  </>
                )}
                {line.vaccine && (
                  <TouchableOpacity onPress={() => openForm('vaccines', { name: line.vaccine })} style={[styles.doneButton, { backgroundColor: colors.success + '22' }]}>
                    <Text style={[styles.doneText, { color: colors.success }]}>✓ {tx('Done', 'Fait')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {upcoming.length > 4 && (
              <TouchableOpacity onPress={() => setShowAll(!showAll)} style={styles.more}>
                <Text style={[styles.moreText, { color: colors.primary }]}>{showAll ? tx('Show less', 'Voir moins') : tx(`See all ${upcoming.length}`, `Voir les ${upcoming.length}`)}</Text>
              </TouchableOpacity>
            )}
            {upcoming.length === 0 && activeMeds.length === 0 && (
              <Text style={[styles.emptyLine, { color: colors.textSecondary }]}>
                {tx(`Nothing planned yet for ${pet?.pet_name}. The wand works out the next dates for you.`, `Rien de prévu pour ${pet?.pet_name} pour l'instant. La baguette calcule les prochaines dates pour toi.`)}
              </Text>
            )}

            <TouchableOpacity onPress={generate} disabled={working} activeOpacity={0.85} style={[styles.wand, { backgroundColor: colors.primary, opacity: working ? 0.6 : 1 }]}>
              <Text style={styles.wandIcon}>🪄</Text>
              <View style={styles.lineBody}>
                <Text style={styles.wandTitle}>{working ? tx('Working it out…', 'Calcul en cours…') : tx('Work out the next dates', 'Générer les prochaines dates')}</Text>
                <Text style={styles.wandText}>{tx("Vaccines, deworming, flea care, check-up: from the pet's species and age", "Vaccins, vermifuge, antiparasitaire, visite : selon l'espèce et l'âge")}</Text>
              </View>
            </TouchableOpacity>
            {notice && <Text style={[styles.notice, { color: colors.success }]}>{notice}</Text>}
            <Text style={[styles.footnote, { color: colors.textTertiary }]}>
              {tx('The dates follow the usual calendar for the species. Your vet has the last word. One reminder a week before and one the day before, nothing more.', "Les dates suivent le calendrier habituel de l'espèce. Ton vétérinaire a le dernier mot. Un rappel une semaine avant et un la veille, pas plus.")}
            </Text>
          </View>

          {/* The record itself */}
          <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {(Object.keys(tabConfig) as Tab[]).map(tab => {
              const count = tab === 'vaccines' ? vaccinations.length : tab === 'meds' ? medications.length : vetVisits.length;
              const selected = activeTab === tab;
              return (
                <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.tab, selected && { backgroundColor: tabConfig[tab].color + '1F' }]}>
                  <Text style={styles.tabEmoji}>{tabConfig[tab].emoji}</Text>
                  <Text style={[styles.tabLabel, { color: selected ? colors.text : colors.textSecondary, fontWeight: selected ? '800' : '600' }]} numberOfLines={1}>{tabConfig[tab].label}</Text>
                  <Text style={[styles.tabCount, { color: colors.textTertiary }]}>{count}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity onPress={() => openForm(activeTab, activeTab === 'visits' ? { date: addDays(new Date(new Date().setHours(10, 0, 0, 0)), 1) } : {})} activeOpacity={0.85} style={[styles.addButton, { backgroundColor: config.color }]}>
            <Text style={styles.addButtonText}>＋ {config.add}</Text>
          </TouchableOpacity>

          {data.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>{config.emoji}</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{tx('Nothing here yet', 'Rien ici pour le moment')}</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {activeTab === 'vaccines'
                  ? tx('Add the last vaccine done: its next dose is worked out and reminded on its own.', 'Ajoute le dernier vaccin fait : son prochain rappel est calculé et annoncé tout seul.')
                  : activeTab === 'meds'
                    ? tx('Add a treatment with how often it is given: a message only on the days it is due.', 'Ajoute un traitement avec son rythme : un message seulement les jours où il est à donner.')
                    : tx('Add a past visit, or an appointment to come: reminded the day before and a few hours before.', 'Ajoute une visite passée, ou un rendez-vous à venir : rappelé la veille et quelques heures avant.')}
              </Text>
            </View>
          ) : (
            data.map(record => {
              const future = activeTab === 'visits' && new Date(record.date).getTime() > Date.now();
              return (
                <View key={record.id} style={[styles.recordCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: config.color }]}>
                  <View style={styles.lineBody}>
                    <Text style={[styles.recordTitle, { color: colors.text }]}>
                      {activeTab === 'vaccines' ? record.vaccine : activeTab === 'meds' ? record.name : record.reason || tx('Vet visit', 'Visite vétérinaire')}
                    </Text>
                    {activeTab === 'vaccines' && (
                      <Text style={[styles.recordMeta, { color: colors.textSecondary }]}>
                        {tx(`Done on ${day(record.date)}`, `Fait le ${day(record.date)}`)}{record.vet_name ? ` · ${record.vet_name}` : ''}
                        {record.next_due ? `\n${tx('Next dose', 'Prochain rappel')} : ${day(record.next_due)}` : ''}
                      </Text>
                    )}
                    {activeTab === 'meds' && (
                      <Text style={[styles.recordMeta, { color: colors.textSecondary }]}>
                        {[record.dosage, record.frequency].filter(Boolean).join(' · ')}{record.dosage || record.frequency ? '\n' : ''}
                        {record.end_date ? tx(`${day(record.start_date)} to ${day(record.end_date)}`, `Du ${day(record.start_date)} au ${day(record.end_date)}`) : tx(`Since ${day(record.start_date)}`, `Depuis le ${day(record.start_date)}`)}
                      </Text>
                    )}
                    {activeTab === 'visits' && (
                      <Text style={[styles.recordMeta, { color: colors.textSecondary }]}>
                        {new Date(record.date).toLocaleString(locale, future ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' })}
                        {record.vet_name ? ` · ${record.vet_name}` : ''}{record.diagnosis ? `\n${record.diagnosis}` : ''}
                      </Text>
                    )}
                    {activeTab === 'meds' && (
                      <Text style={[styles.status, { color: isActive(record) ? colors.success : colors.textTertiary }]}>{isActive(record) ? tx('● In progress', '● En cours') : tx('Finished', 'Terminé')}</Text>
                    )}
                    {future && <Text style={[styles.status, { color: colors.warning }]}>{tx('● Appointment to come', '● Rendez-vous à venir')}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => removeRecord(record.id)} hitSlop={8} accessibilityLabel={tx('Delete', 'Supprimer')}>
                    <Text style={styles.deleteIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
          {/* Room for the floating bar */}
          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      <Modal visible={formKind !== null} animationType="slide" transparent onRequestClose={() => setFormKind(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {formKind === 'reminder' ? `📌 ${tx('Add a reminder', 'Ajouter un rappel')}` : formKind ? `${tabConfig[formKind].emoji} ${tabConfig[formKind].add}` : ''}
              </Text>
              <TouchableOpacity onPress={() => setFormKind(null)} style={[styles.modalClose, { backgroundColor: colors.backgroundElement }]} accessibilityLabel={tx('Close', 'Fermer')}>
                <Text style={[styles.modalCloseText, { color: colors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {formKind === 'vaccines' && (
                <>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{tx('VACCINE', 'VACCIN')}</Text>
                  {vaccineNames(pet?.species, language === 'fr' ? 'fr' : 'en').length > 0 && (
                    <View style={styles.chips}>
                      {vaccineNames(pet?.species, language === 'fr' ? 'fr' : 'en').map(name => (
                        <TouchableOpacity key={name} onPress={() => setForm({ ...form, name })} style={chip(form.name === name)}>
                          <Text style={chipText(form.name === name)}>{name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <TextInput style={input} placeholder={tx('Or type its name', 'Ou écris son nom')} placeholderTextColor={colors.textTertiary} value={form.name} onChangeText={name => setForm({ ...form, name })} />
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{tx('DONE ON', 'FAIT LE')}</Text>
                  <DateField value={form.date} onChange={date => setForm({ ...form, date })} locale={locale} colors={colors} />
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{tx('NEXT DOSE', 'PROCHAIN RAPPEL')}</Text>
                  <View style={styles.chips}>
                    {NEXT_DOSES.map(([key, en, fr]) => (
                      <TouchableOpacity key={key} onPress={() => setForm({ ...form, nextDose: key })} style={chip(form.nextDose === key)}>
                        <Text style={chipText(form.nextDose === key)}>{tx(en, fr)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    {computedNext ? tx(`Reminded on its own: a week before and the day before ${day(computedNext)}.`, `Rappelé tout seul : une semaine avant et la veille du ${day(computedNext)}.`) : tx('No reminder for this vaccine.', 'Pas de rappel pour ce vaccin.')}
                  </Text>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{tx('VET (OPTIONAL)', 'VÉTÉRINAIRE (FACULTATIF)')}</Text>
                  <TextInput style={input} placeholder={tx('Name of the vet or clinic', 'Nom du vétérinaire ou de la clinique')} placeholderTextColor={colors.textTertiary} value={form.vet} onChangeText={vet => setForm({ ...form, vet })} />
                </>
              )}

              {formKind === 'meds' && (
                <>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{tx('TREATMENT', 'TRAITEMENT')}</Text>
                  <TextInput style={input} placeholder={tx('e.g. Amoxicillin, flea pipette…', 'ex. Amoxicilline, pipette antipuces…')} placeholderTextColor={colors.textTertiary} value={form.name} onChangeText={name => setForm({ ...form, name })} />
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{tx('DOSE (OPTIONAL)', 'DOSE (FACULTATIF)')}</Text>
                  <TextInput style={input} placeholder={tx('e.g. 1 tablet, 2 ml', 'ex. 1 comprimé, 2 ml')} placeholderTextColor={colors.textTertiary} value={form.dosage} onChangeText={dosage => setForm({ ...form, dosage })} />
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{tx('HOW OFTEN', 'RYTHME')}</Text>
                  <View style={styles.chips}>
                    {FREQUENCIES.map(([key, en, fr]) => (
                      <TouchableOpacity key={key} onPress={() => setForm({ ...form, frequency: key })} style={chip(form.frequency === key)}>
                        <Text style={chipText(form.frequency === key)}>{tx(en, fr)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{tx('FROM', 'À PARTIR DU')}</Text>
                  <DateField value={form.date} onChange={date => setForm({ ...form, date })} locale={locale} colors={colors} />
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{tx('FOR', 'PENDANT')}</Text>
                  <View style={styles.chips}>
                    {DURATIONS.map(([days, en, fr]) => (
                      <TouchableOpacity key={days} onPress={() => setForm({ ...form, duration: days })} style={chip(form.duration === days)}>
                        <Text style={chipText(form.duration === days)}>{tx(en, fr)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    {tx('One message in the morning, only on the days it is due', 'Un message le matin, seulement les jours où il est à donner')}
                    {form.duration ? tx(`, until ${day(addDays(form.date, form.duration - 1))}.`, `, jusqu'au ${day(addDays(form.date, form.duration - 1))}.`) : '.'}
                  </Text>
                </>
              )}

              {formKind === 'visits' && (
                <>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{tx('DATE AND TIME', 'DATE ET HEURE')}</Text>
                  <DateField value={form.date} onChange={date => setForm({ ...form, date })} mode="datetime" locale={locale} colors={colors} />
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    {form.date.getTime() > Date.now()
                      ? tx('An appointment to come: reminded the day before and a few hours before.', 'Rendez-vous à venir : rappelé la veille et quelques heures avant.')
                      : tx('A past visit: kept in the record, it counts for the health score.', 'Visite passée : gardée dans le carnet, elle compte pour le score santé.')}
                  </Text>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{tx('VET (OPTIONAL)', 'VÉTÉRINAIRE (FACULTATIF)')}</Text>
                  <TextInput style={input} placeholder={tx('Name of the vet or clinic', 'Nom du vétérinaire ou de la clinique')} placeholderTextColor={colors.textTertiary} value={form.vet} onChangeText={vet => setForm({ ...form, vet })} />
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{tx('REASON (OPTIONAL)', 'MOTIF (FACULTATIF)')}</Text>
                  <TextInput style={input} placeholder={tx('e.g. Yearly check-up, limping…', 'ex. Visite annuelle, boiterie…')} placeholderTextColor={colors.textTertiary} value={form.reason} onChangeText={reason => setForm({ ...form, reason })} />
                </>
              )}

              {formKind === 'reminder' && (
                <>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{tx('WHAT', 'QUOI')}</Text>
                  <TextInput style={input} placeholder={tx('e.g. Flea treatment, claws, grooming…', 'ex. Antiparasitaire, griffes, toilettage…')} placeholderTextColor={colors.textTertiary} value={form.name} onChangeText={name => setForm({ ...form, name })} />
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{tx('WHEN', 'QUAND')}</Text>
                  <DateField value={form.date} onChange={date => setForm({ ...form, date })} locale={locale} colors={colors} />
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{tx('COMES BACK', 'REVIENT')}</Text>
                  <View style={styles.chips}>
                    {REPEATS.map(([days, en, fr]) => (
                      <TouchableOpacity key={days} onPress={() => setForm({ ...form, repeat: days })} style={chip(form.repeat === days)}>
                        <Text style={chipText(form.repeat === days)}>{tx(en, fr)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    {form.repeat ? tx('Once ticked as done, the next one is planned on its own.', 'Une fois coché comme fait, le suivant se prévoit tout seul.') : tx('Reminded the day before.', 'Rappelé la veille.')}
                  </Text>
                </>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.backgroundElement }]} onPress={() => setFormKind(null)}>
                <Text style={[styles.buttonText, { color: colors.text }]}>{tx('Cancel', 'Annuler')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]} onPress={save} disabled={saving}>
                <Text style={styles.saveButtonText}>{saving ? tx('Saving…', 'Enregistrement…') : tx('Save', 'Enregistrer')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  page: { paddingHorizontal: 16, paddingTop: 16 },

  headerLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  headerTitle: { fontSize: 26, fontWeight: '800', marginTop: 2, marginBottom: 14 },

  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 18 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 18, fontWeight: '800' },
  smallButton: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  smallButtonText: { fontSize: 13, fontWeight: '700' },

  line: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  lineIcon: { fontSize: 20, width: 26, textAlign: 'center' },
  lineBody: { flex: 1 },
  lineTitle: { fontSize: 14, fontWeight: '700' },
  lineWhen: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  doneButton: { paddingVertical: 7, paddingHorizontal: 11, borderRadius: 999 },
  doneText: { fontSize: 12, fontWeight: '800' },
  removeText: { fontSize: 15, fontWeight: '700', paddingHorizontal: 2 },
  more: { paddingVertical: 10, alignItems: 'center' },
  moreText: { fontSize: 13, fontWeight: '700' },
  emptyLine: { fontSize: 13, lineHeight: 19, paddingVertical: 10 },

  wand: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, marginTop: 12 },
  wandIcon: { fontSize: 24 },
  wandTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  wandText: { color: 'rgba(255,255,255,0.88)', fontSize: 12, lineHeight: 16, marginTop: 2 },
  notice: { fontSize: 13, fontWeight: '700', marginTop: 10 },
  footnote: { fontSize: 11, lineHeight: 16, marginTop: 10 },

  tabBar: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 4, gap: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, paddingHorizontal: 4, borderRadius: 10 },
  tabEmoji: { fontSize: 15 },
  tabLabel: { fontSize: 13, flexShrink: 1 },
  tabCount: { fontSize: 12, fontWeight: '700' },

  addButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12, marginBottom: 14 },
  addButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  emptyState: { alignItems: 'center', paddingVertical: 28 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptyText: { fontSize: 13, textAlign: 'center', maxWidth: 320, lineHeight: 19 },

  recordCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderLeftWidth: 4, marginBottom: 10 },
  recordTitle: { fontSize: 15, fontWeight: '700' },
  recordMeta: { fontSize: 12, lineHeight: 18, marginTop: 3, fontWeight: '500' },
  status: { fontSize: 12, fontWeight: '700', marginTop: 5 },
  deleteIcon: { fontSize: 17 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800', flex: 1 },
  modalClose: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  modalCloseText: { fontSize: 16, fontWeight: '700' },

  formLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 14, marginBottom: 8 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingVertical: 9, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 8 },

  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 18 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { fontWeight: '700', fontSize: 14 },
  saveButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: 'white', fontWeight: '700', fontSize: 14 },
});
