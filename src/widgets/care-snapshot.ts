import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { getPetHealthScore } from '@/lib/health-score';

// What the GRRR Care home-screen widgets show, already in the user's language. Built from the
// database for one pet, both by the app and by the widgets themselves every 30 minutes (app
// closed), so the numbers stay true without opening the app.

export type Language = 'en' | 'fr';

export interface CareItem {
  icon: string;
  text: string;
  /** Today, overdue: drawn in the alert color */
  urgent: boolean;
}

export interface CareSnapshot {
  updatedAt: string;
  language: Language;
  petId: string;
  pet: { name: string; photo: string; icon: string };
  health: {
    /** "82" or "—" without enough data */
    score: string;
    /** "Bonne santé", "À surveiller", "À faire"… */
    label: string;
    color: string;
    /** The most useful next step, or an invitation to fill the record */
    advice: string;
    /** The next care event, one line */
    next: string;
  };
  today: { title: string; items: CareItem[]; empty: string };
}

export const CARE_SNAPSHOT_KEY = 'grrrcare.widget.snapshot';
/** The pet the widgets follow (the one last selected in the app). */
export const CARE_WIDGET_PET_KEY = 'grrrcare.widget.petId';
export const CARE_LINKS = { health: 'grrrcaremobile://health', chat: 'grrrcaremobile://chat', pets: 'grrrcaremobile://pets' };

const COLORS = { good: '#10B981', attention: '#F59E0B', action: '#EF4444', none: '#64748B' };
const SPECIES_ICON: Record<string, string> = { dog: '🐶', cat: '🐱', rabbit: '🐰', hamster: '🐹', guinea_pig: '🐹', bird: '🐦', parrot: '🦜', ferret: '🦦', horse: '🐴', turtle: '🐢' };

const DAY = 864e5;
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
const daysFrom = (iso: string, now: Date) => Math.round((startOfDay(new Date(iso)) - startOfDay(now)) / DAY);
const hhmm = (iso: string) => {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export async function readLanguage(): Promise<Language> {
  const saved = await AsyncStorage.getItem('language').catch(() => null);
  return saved === 'fr' ? 'fr' : 'en';
}

/** The pet followed by the widgets: the one picked in the app, otherwise the account's first. */
export async function widgetPetId(userId: string): Promise<string | null> {
  const saved = await AsyncStorage.getItem(CARE_WIDGET_PET_KEY).catch(() => null);
  if (saved) return saved;
  const { data } = await supabase.from('pets').select('id').eq('owner_id', userId).eq('adopter_only', false).order('created_at', { ascending: true }).limit(1);
  return data?.[0]?.id ?? null;
}

export async function buildCareSnapshot(petId: string, language: Language, now = new Date()): Promise<CareSnapshot | null> {
  const tx = (en: string, fr: string) => (language === 'fr' ? fr : en);
  const { data: pet } = await supabase.from('pets').select('*').eq('id', petId).maybeSingle();
  if (!pet) return null;
  const [vaccinations, visits, medications, score] = await Promise.all([
    supabase.from('vaccinations').select('vaccine, date, next_due').eq('pet_id', petId).then((r) => r.data ?? []),
    supabase.from('vet_visits').select('date, vet_name, reason').eq('pet_id', petId).gt('date', now.toISOString()).order('date', { ascending: true }).limit(3).then((r) => r.data ?? []),
    supabase.from('medications').select('name, dosage, frequency, start_date, end_date').eq('pet_id', petId).lte('start_date', now.toISOString()).then((r) => r.data ?? []),
    getPetHealthScore(pet).catch(() => null),
  ]);

  // Vaccines: the latest dose of each one, with its next due date.
  const latest = new Map<string, { vaccine: string; date: string; next_due: string | null }>();
  for (const v of vaccinations as { vaccine: string; date: string; next_due: string | null }[]) {
    const key = v.vaccine.toLowerCase();
    const current = latest.get(key);
    if (!current || v.date > current.date) latest.set(key, v);
  }
  const dueVaccines = [...latest.values()].filter((v) => v.next_due).sort((a, b) => a.next_due!.localeCompare(b.next_due!));
  const activeMeds = (medications as { name: string; dosage: string | null; frequency: string | null; end_date: string | null }[]).filter((m) => !m.end_date || daysFrom(m.end_date, now) >= 0);

  const when = (iso: string) => {
    const days = daysFrom(iso, now);
    if (days < 0) return tx(`${-days} d late`, `en retard de ${-days} j`);
    if (days === 0) return tx('today', "aujourd'hui");
    if (days === 1) return tx('tomorrow', 'demain');
    return tx(`in ${days} days`, `dans ${days} j`);
  };

  const items: CareItem[] = [];
  for (const m of activeMeds.slice(0, 2)) items.push({ icon: '💊', text: [m.name, m.dosage, m.frequency].filter(Boolean).join(' · '), urgent: true });
  for (const v of visits as { date: string; vet_name: string | null; reason: string | null }[]) {
    if (daysFrom(v.date, now) <= 7) items.push({ icon: '🩺', text: `${[v.vet_name, v.reason].filter(Boolean).join(' · ') || tx('Vet visit', 'Vétérinaire')} · ${when(v.date)} ${hhmm(v.date)}`, urgent: daysFrom(v.date, now) <= 1 });
  }
  for (const v of dueVaccines) {
    if (daysFrom(v.next_due!, now) <= 30) items.push({ icon: daysFrom(v.next_due!, now) < 0 ? '⚠️' : '💉', text: `${v.vaccine} · ${when(v.next_due!)}`, urgent: daysFrom(v.next_due!, now) <= 1 });
  }

  const nextVisit = (visits as { date: string }[])[0];
  const nextVaccine = dueVaccines.find((v) => daysFrom(v.next_due!, now) >= -60);
  const next = nextVisit && (!nextVaccine || nextVisit.date < nextVaccine.next_due!)
    ? `🩺 ${tx('Vet', 'Vétérinaire')} ${when(nextVisit.date)} · ${hhmm(nextVisit.date)}`
    : nextVaccine ? `💉 ${nextVaccine.vaccine} ${when(nextVaccine.next_due!)}`
    : tx('📅 Nothing planned: add the next vaccine', '📅 Rien de prévu : ajoute le prochain vaccin');

  const ok = score?.status === 'ok' ? score : null;
  const health = ok
    ? {
        score: String(Math.round(ok.score)),
        label: ok.level === 'good' ? tx('Good health', 'Bonne santé') : ok.level === 'attention' ? tx('To watch', 'À surveiller') : tx('Action needed', 'À faire'),
        color: COLORS[ok.level],
        advice: ok.nextSteps[0] ? ok.nextSteps[0].advice[language] : tx('Everything is up to date 🎉', 'Tout est à jour 🎉'),
        next,
      }
    : {
        score: '—',
        label: tx('Not enough info', "Pas assez d'infos"),
        color: COLORS.none,
        advice: tx('Add vaccines, visits and weight to see the score.', 'Ajoute vaccins, visites et poids pour voir le score.'),
        next,
      };

  return {
    updatedAt: now.toISOString(),
    language,
    petId,
    pet: { name: pet.pet_name, photo: pet.photo_url ?? '', icon: SPECIES_ICON[String(pet.species).toLowerCase()] ?? '🐾' },
    health,
    today: {
      title: tx(`${pet.pet_name}'s care`, `Les soins de ${pet.pet_name}`),
      items: items.slice(0, 3),
      empty: tx('Nothing to do today ✨', "Rien de prévu aujourd'hui ✨"),
    },
  };
}

export async function readCareSnapshot(): Promise<CareSnapshot | null> {
  try {
    const stored = await AsyncStorage.getItem(CARE_SNAPSHOT_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}
