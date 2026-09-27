// Health follow-up score — data model.
// The engine never branches on species: everything species- or age-specific lives in a HealthProfile (data).

export type Text = { en: string; fr: string };

/** Where a rule looks. Each source is normalised to HealthRecord by the engine. */
export type RecordSource = 'vaccinations' | 'vet_visits' | 'medications' | 'documents';

export type HealthRecord = {
  /** When it happened (vaccine given, visit, treatment start, document issued). */
  date: string | null;
  /** When it runs out (next vaccine due, treatment end, document expiry). */
  due: string | null;
  /** Text the rule's `match` is tested against (vaccine name, visit reason, document type…). */
  label: string;
};

type RuleBase = {
  id: string;
  /** Relative weight inside its category (default 1). */
  weight?: number;
  /** Case-insensitive regular expression tested against the record label. */
  match?: string;
  /** When there is nothing to evaluate, leave the rule out instead of scoring 0. */
  optional?: boolean;
  /** Shown to the owner when the rule is not fully met. */
  advice: Text;
};

export type Rule =
  /** The latest matching record is at most `within_days` old; the score then fades to 0 over `grace_days`. */
  | (RuleBase & { type: 'recent'; source: RecordSource; within_days: number; grace_days?: number })
  /** At least one matching record exists. */
  | (RuleBase & { type: 'exists'; source: RecordSource })
  /** For each matching item (latest per label), its due date has not passed; fades to 0 over `grace_days`. */
  | (RuleBase & { type: 'not_overdue'; source: RecordSource; grace_days?: number })
  /** A field of the pet profile is filled in (e.g. microchip, weight). */
  | (RuleBase & { type: 'pet_field'; field: string })
  /** While a matching record is active (no end, or ends in the future), a `review_source` record exists within `within_days`. */
  | (RuleBase & { type: 'review_when_active'; source: RecordSource; review_source: RecordSource; within_days: number });

export type Category = {
  key: string;
  label: Text;
  /** Share of the total score. Weights of a profile should add up to 1. */
  weight: number;
  rules: Rule[];
};

export type HealthProfile = {
  id: string;
  /** Lower-case species, as stored on the pet ("dog", "cat", "rabbit"…). */
  species: string;
  age_group: string;
  label: Text;
  /** Age range in months: min included, max excluded (null = no upper limit). */
  min_age_months: number;
  max_age_months: number | null;
  categories: Category[];
  /** Below this share of evaluable weight, no score is shown ("not enough data"). */
  min_coverage?: number;
  /** "provisional" until a veterinarian has validated the rules. */
  status: 'provisional' | 'validated';
  validated_by?: string | null;
  validated_at?: string | null;
};

export type PetForScore = {
  species?: string | null;
  age?: number | null;
  birthday?: string | null;
  [field: string]: unknown;
};

export type HealthData = {
  vaccinations: { vaccine?: string | null; date?: string | null; next_due?: string | null }[];
  vet_visits: { date?: string | null; reason?: string | null; diagnosis?: string | null }[];
  medications: { name?: string | null; start_date?: string | null; end_date?: string | null }[];
  documents: { doc_type?: string | null; title?: string | null; issued_on?: string | null; expires_on?: string | null }[];
};

export type RuleResult = { rule: Rule; score: number | null };
export type CategoryResult = { category: Category; score: number | null; rules: RuleResult[] };

export type HealthScoreResult =
  | { status: 'no_profile'; species: string }
  | { status: 'no_data'; profile: HealthProfile }
  | { status: 'insufficient_data'; profile: HealthProfile; coverage: number; categories: CategoryResult[] }
  | {
      status: 'ok';
      profile: HealthProfile;
      /** 0–100 */
      score: number;
      level: 'good' | 'attention' | 'action';
      /** Share (0–1) of the profile's weight that could be evaluated. */
      coverage: number;
      categories: CategoryResult[];
      /** The rules that would raise the score the most, best first. */
      nextSteps: { advice: Text; gain: number }[];
    };
