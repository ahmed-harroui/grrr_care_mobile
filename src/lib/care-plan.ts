// The care plan of a pet: what is coming that is not yet in its record. The "magic wand" works the
// next dates out from the species and the age, with what the record already holds.
// The calendars below follow the usual veterinary practice in France. They are a starting point,
// not a prescription: the vet adapts them to the animal (way of life, region, health).

export type PlanKind = 'vaccine' | 'deworming' | 'parasite' | 'checkup' | 'other';

export interface PlanItem {
  id: string;
  pet_id: string;
  kind: PlanKind;
  title: string;
  title_en?: string | null;
  /** YYYY-MM-DD */
  due_date: string;
  repeat_days?: number | null;
  done_at?: string | null;
  source: 'manual' | 'wand';
  plan_key?: string | null;
}

export type NewPlanItem = Omit<PlanItem, 'id' | 'pet_id' | 'done_at'>;

type Text2 = [en: string, fr: string];

interface VaccineLine {
  code: string;
  name: Text2;
  /** Recognises this vaccine among the names typed in the record */
  match: RegExp;
  /** Ages of the first doses, in weeks */
  primaryWeeks: number[];
  /** Then every… days */
  boosterDays: number;
}

interface SpeciesPlan {
  vaccines: VaccineLine[];
  /** Deworming: every month until this age (months), then every `dewormDays` */
  dewormMonthlyUntil?: number;
  dewormDays?: number;
  /** Fleas and ticks, every… days */
  parasiteDays?: number;
  /** Check-up every year, twice a year from this age (years) */
  seniorFrom: number;
}

const YEAR = 365;

const PLANS: Record<string, SpeciesPlan> = {
  dog: {
    vaccines: [
      { code: 'chppil', name: ['Core vaccine (distemper, hepatitis, parvo, lepto)', 'Vaccin CHPPi + leptospirose'], match: /chp|dhp|carr|parvo|lepto|h[ée]patite|distemper/i, primaryWeeks: [8, 12, 16], boosterDays: YEAR },
      { code: 'rabies', name: ['Rabies (needed to travel)', 'Rage (obligatoire pour voyager)'], match: /rage|rabies/i, primaryWeeks: [12], boosterDays: YEAR },
    ],
    dewormMonthlyUntil: 6,
    dewormDays: 91,
    parasiteDays: 30,
    seniorFrom: 8,
  },
  cat: {
    vaccines: [
      { code: 'tc', name: ['Core vaccine (panleukopenia, cat flu)', 'Vaccin typhus + coryza'], match: /typhus|coryza|fvrcp|panleu|rcp|\btc\b|calici|herp/i, primaryWeeks: [8, 12, 16], boosterDays: YEAR },
      { code: 'felv', name: ['Leukaemia (cats that go outside)', 'Leucose (chats qui sortent)'], match: /leucose|felv|leuk/i, primaryWeeks: [8, 12], boosterDays: YEAR },
    ],
    dewormMonthlyUntil: 6,
    dewormDays: 91,
    parasiteDays: 30,
    seniorFrom: 10,
  },
  rabbit: {
    vaccines: [
      { code: 'myxo', name: ['Myxomatosis + viral haemorrhagic disease', 'Myxomatose + maladie hémorragique (VHD)'], match: /myxo|vhd|rhd|h[ée]morragi|hemorrhag/i, primaryWeeks: [7], boosterDays: YEAR },
    ],
    seniorFrom: 5,
  },
  ferret: {
    vaccines: [
      { code: 'distemper', name: ['Distemper', 'Maladie de Carré'], match: /carr|distemper/i, primaryWeeks: [8, 12], boosterDays: YEAR },
    ],
    dewormDays: 182,
    parasiteDays: 30,
    seniorFrom: 4,
  },
};
/** Any other species: no routine vaccine, a yearly check-up. */
const OTHER: SpeciesPlan = { vaccines: [], seniorFrom: 99 };

const DAY = 864e5;
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** "dog" from "Dog", "chien", "Chienne"… as typed on the profile. */
export function speciesKey(species?: string | null): string {
  const s = String(species ?? '').toLowerCase();
  if (/dog|chien|puppy|chiot/.test(s)) return 'dog';
  if (/cat|chat|kitten/.test(s)) return 'cat';
  if (/rabbit|lapin/.test(s)) return 'rabbit';
  if (/ferret|furet/.test(s)) return 'ferret';
  return s;
}

/** The birth date: the birthday when the profile has it, else worked back from the age in years. */
export function birthDate(pet: { birthday?: string | null; age?: number | null }, now = new Date()): Date | null {
  if (pet.birthday && !Number.isNaN(Date.parse(pet.birthday))) return startOfDay(new Date(pet.birthday));
  if (pet.age != null && pet.age > 0) return addDays(startOfDay(now), -Math.round(pet.age * 365.25));
  return null;
}

/** The vaccine names offered when adding a vaccine, for this species. */
export function vaccineNames(species: string | null | undefined, language: 'en' | 'fr'): string[] {
  return (PLANS[speciesKey(species)] ?? OTHER).vaccines.map(v => v.name[language === 'fr' ? 1 : 0]);
}

/** When the next dose of a vaccine is due after one given on `date` (a year later for the usual ones). */
export function nextDoseAfter(species: string | null | undefined, vaccine: string, date: Date): Date {
  const line = (PLANS[speciesKey(species)] ?? OTHER).vaccines.find(v => v.match.test(vaccine));
  return addDays(date, line?.boosterDays ?? YEAR);
}

interface Records {
  vaccinations: { vaccine?: string | null; date?: string | null; next_due?: string | null }[];
  vetVisits: { date?: string | null }[];
  /** What the plan already holds, done or not */
  plan: PlanItem[];
}

/**
 * The next dates for this pet. Nothing is proposed for what the record already follows: a vaccine
 * with its next dose noted is announced from the record itself.
 */
export function suggestPlan(pet: { species?: string | null; birthday?: string | null; age?: number | null }, records: Records, now = new Date()): NewPlanItem[] {
  const plan = PLANS[speciesKey(pet.species)] ?? OTHER;
  const today = startOfDay(now);
  const born = birthDate(pet, now);
  const ageDays = born ? Math.round((today.getTime() - born.getTime()) / DAY) : null;
  const soon = addDays(today, 7);
  const items: NewPlanItem[] = [];
  const add = (kind: PlanKind, code: string, name: Text2, due: Date, repeatDays: number | null) => {
    // Never in the past: what should already be done is to do this week
    const date = due < today ? soon : due;
    items.push({ kind, title: name[1], title_en: name[0], due_date: iso(date), repeat_days: repeatDays, source: 'wand', plan_key: `${kind}:${code}:${iso(date)}` });
  };
  // The last time something of this kind was ticked as done in the plan
  const lastDone = (kind: PlanKind) => {
    const dates = records.plan.filter(item => item.kind === kind && item.done_at).map(item => new Date(item.done_at!).getTime());
    return dates.length ? startOfDay(new Date(Math.max(...dates))) : null;
  };

  for (const line of plan.vaccines) {
    const doses = records.vaccinations.filter(v => v.vaccine && line.match.test(v.vaccine)).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const latest = doses[0];
    if (latest?.next_due) continue;
    if (latest?.date) {
      add('vaccine', line.code, [`${line.name[0]}: booster`, `${line.name[1]} : rappel`], addDays(startOfDay(new Date(latest.date)), line.boosterDays), null);
      continue;
    }
    const lastPrimary = line.primaryWeeks[line.primaryWeeks.length - 1] * 7;
    if (born && ageDays != null && ageDays <= lastPrimary + 14) {
      // A young animal: each first dose still ahead (one missed by less than 2 weeks is to do now)
      line.primaryWeeks.forEach((weeks, index) => {
        const due = addDays(born, weeks * 7);
        if (due.getTime() >= today.getTime() - 14 * DAY) {
          add('vaccine', `${line.code}${index + 1}`, [`${line.name[0]}: dose ${index + 1}`, `${line.name[1]} : dose ${index + 1}`], due, null);
        }
      });
      add('vaccine', `${line.code}b`, [`${line.name[0]}: first yearly booster`, `${line.name[1]} : premier rappel annuel`], addDays(born, YEAR), null);
    } else {
      // An adult with nothing on record: check with the vet, then yearly
      add('vaccine', line.code, [`${line.name[0]}: check or booster`, `${line.name[1]} : à vérifier ou rappel`], soon, null);
    }
  }

  if (plan.dewormDays) {
    const young = ageDays != null && plan.dewormMonthlyUntil != null && ageDays < plan.dewormMonthlyUntil * 30.4;
    const every = young ? 30 : plan.dewormDays;
    const last = lastDone('deworming');
    add('deworming', 'worm', ['Deworming', 'Vermifuge'], last ? addDays(last, every) : soon, every);
  }
  if (plan.parasiteDays) {
    const last = lastDone('parasite');
    add('parasite', 'flea', ['Flea and tick treatment', 'Antiparasitaire (puces et tiques)'], last ? addDays(last, plan.parasiteDays) : soon, plan.parasiteDays);
  }

  // Check-up: a year after the last visit, six months for a senior
  const senior = ageDays != null && ageDays >= plan.seniorFrom * 365.25;
  const every = senior ? 182 : YEAR;
  const visits = records.vetVisits.map(v => (v.date ? new Date(v.date).getTime() : 0)).filter(time => time > 0);
  const upcoming = visits.some(time => time >= today.getTime());
  if (!upcoming) {
    const past = visits.filter(time => time < today.getTime());
    const last = past.length ? startOfDay(new Date(Math.max(...past))) : lastDone('checkup');
    add('checkup', 'visit', senior ? ['Senior check-up (every 6 months)', 'Bilan senior (tous les 6 mois)'] : ['Yearly check-up', 'Visite de contrôle annuelle'], last ? addDays(last, every) : addDays(today, 14), every);
  }

  return items.sort((a, b) => a.due_date.localeCompare(b.due_date));
}

export const PLAN_ICON: Record<PlanKind, string> = { vaccine: '💉', deworming: '🪱', parasite: '🛡️', checkup: '🩺', other: '📌' };

/** Days from today to a date (negative: late). */
export function daysUntil(dateIso: string, now = new Date()): number {
  return Math.round((startOfDay(new Date(dateIso)).getTime() - startOfDay(now).getTime()) / DAY);
}

export { iso as isoDay, addDays };
