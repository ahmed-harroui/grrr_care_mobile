import type { CategoryResult, HealthData, HealthProfile, HealthRecord, HealthScoreResult, PetForScore, RecordSource, Rule, RuleResult } from './types';

const DAY = 86_400_000;

/** Pet age in months: from the birthday when known, otherwise from the age in whole years (taken at mid-year). */
export function ageInMonths(pet: PetForScore, today = new Date()): number | null {
  if (pet.birthday) {
    const birth = new Date(pet.birthday);
    if (!Number.isNaN(birth.getTime())) {
      return Math.max(0, (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth() - (today.getDate() < birth.getDate() ? 1 : 0));
    }
  }
  return typeof pet.age === 'number' && pet.age >= 0 ? pet.age * 12 + 6 : null;
}

/** Picks the profile for this pet's species and age. Pure data lookup — no species logic in code. */
export function selectProfile(pet: PetForScore, profiles: HealthProfile[], today = new Date()): HealthProfile | null {
  const species = (pet.species ?? '').trim().toLowerCase();
  const candidates = profiles
    .filter((p) => p.species.toLowerCase() === species)
    .sort((a, b) => a.min_age_months - b.min_age_months);
  if (candidates.length === 0) return null;
  const months = ageInMonths(pet, today);
  if (months == null) return candidates.find((p) => p.age_group === 'adult') ?? candidates[0];
  return candidates.find((p) => months >= p.min_age_months && (p.max_age_months == null || months < p.max_age_months))
    ?? candidates[candidates.length - 1];
}

function toRecords(data: HealthData, source: RecordSource): HealthRecord[] {
  switch (source) {
    case 'vaccinations':
      return data.vaccinations.map((v) => ({ date: v.date ?? null, due: v.next_due ?? null, label: v.vaccine ?? '' }));
    case 'vet_visits':
      return data.vet_visits.map((v) => ({ date: v.date ?? null, due: null, label: [v.reason, v.diagnosis].filter(Boolean).join(' ') }));
    case 'medications':
      return data.medications.map((m) => ({ date: m.start_date ?? null, due: m.end_date ?? null, label: m.name ?? '' }));
    case 'documents':
      return data.documents.map((d) => ({ date: d.issued_on ?? null, due: d.expires_on ?? null, label: [d.doc_type, d.title].filter(Boolean).join(' ') }));
  }
}

const time = (iso: string | null) => (iso ? new Date(iso).getTime() : NaN);

function matching(data: HealthData, source: RecordSource, pattern?: string) {
  const records = toRecords(data, source);
  if (!pattern) return records;
  let re: RegExp;
  try { re = new RegExp(pattern, 'i'); } catch { return []; } // a bad pattern in the data must not crash the app
  return records.filter((r) => re.test(r.label));
}

/** 1 when on time, fading linearly to 0 once `lateDays` reaches `graceDays`. */
const fade = (lateDays: number, graceDays = 0) => (lateDays <= 0 ? 1 : graceDays > 0 ? Math.max(0, 1 - lateDays / graceDays) : 0);

/** Score of one rule, 0–1, or null when the rule does not apply to this pet. */
export function evaluateRule(rule: Rule, pet: PetForScore, data: HealthData, today = new Date()): number | null {
  const now = today.getTime();
  const missing = rule.optional ? null : 0;
  switch (rule.type) {
    case 'recent': {
      const dates = matching(data, rule.source, rule.match).map((r) => time(r.date)).filter((t) => !Number.isNaN(t));
      if (dates.length === 0) return missing;
      const ageDays = (now - Math.max(...dates)) / DAY;
      return fade(ageDays - rule.within_days, rule.grace_days);
    }
    case 'exists':
      return matching(data, rule.source, rule.match).length > 0 ? 1 : missing;
    case 'not_overdue': {
      // Only the latest record per label counts: a booster supersedes the previous due date.
      const latest = new Map<string, HealthRecord>();
      for (const r of matching(data, rule.source, rule.match)) {
        const k = r.label.trim().toLowerCase();
        const prev = latest.get(k);
        if (!prev || time(r.date) > time(prev.date)) latest.set(k, r);
      }
      const dues = [...latest.values()].map((r) => time(r.due)).filter((t) => !Number.isNaN(t));
      if (dues.length === 0) return missing;
      const scores = dues.map((due) => fade((now - due) / DAY, rule.grace_days));
      return scores.reduce((a, b) => a + b, 0) / scores.length;
    }
    case 'pet_field': {
      const value = pet[rule.field];
      return value !== null && value !== undefined && value !== '' ? 1 : missing;
    }
    case 'review_when_active': {
      const active = matching(data, rule.source, rule.match).filter((r) => {
        const end = time(r.due);
        return Number.isNaN(end) || end >= now;
      });
      if (active.length === 0) return null; // nothing ongoing: nothing to review
      const reviews = toRecords(data, rule.review_source).map((r) => time(r.date)).filter((t) => !Number.isNaN(t));
      if (reviews.length === 0) return 0;
      return fade((now - Math.max(...reviews)) / DAY - rule.within_days, rule.within_days / 2);
    }
  }
}

const hasAnyRecord = (data: HealthData) =>
  data.vaccinations.length + data.vet_visits.length + data.medications.length + data.documents.length > 0;

/**
 * Score = Σ(category score × category weight) / Σ(weights of the categories that could be evaluated).
 * Categories with nothing to evaluate are left out and the others re-weighted, so "unknown" is never "bad".
 */
export function computeHealthScore(pet: PetForScore, data: HealthData, profiles: HealthProfile[], today = new Date()): HealthScoreResult {
  const profile = selectProfile(pet, profiles, today);
  if (!profile) return { status: 'no_profile', species: (pet.species ?? '').toLowerCase() };
  if (!hasAnyRecord(data)) return { status: 'no_data', profile };

  const categories: CategoryResult[] = profile.categories.map((category) => {
    const rules: RuleResult[] = category.rules.map((rule) => ({ rule, score: evaluateRule(rule, pet, data, today) }));
    const applicable = rules.filter((r) => r.score != null);
    const weight = applicable.reduce((sum, r) => sum + (r.rule.weight ?? 1), 0);
    const score = weight > 0 ? applicable.reduce((sum, r) => sum + r.score! * (r.rule.weight ?? 1), 0) / weight : null;
    return { category, score, rules };
  });

  const totalWeight = profile.categories.reduce((sum, c) => sum + c.weight, 0);
  const evaluated = categories.filter((c) => c.score != null);
  const evaluatedWeight = evaluated.reduce((sum, c) => sum + c.category.weight, 0);
  const coverage = totalWeight > 0 ? evaluatedWeight / totalWeight : 0;
  if (evaluatedWeight === 0 || coverage < (profile.min_coverage ?? 0.5)) {
    return { status: 'insufficient_data', profile, coverage, categories };
  }

  const raw = evaluated.reduce((sum, c) => sum + c.score! * c.category.weight, 0) / evaluatedWeight;
  const score = Math.round(raw * 100);

  // Points each unmet rule would add to the final score if it were fully met.
  const nextSteps = evaluated
    .flatMap((c) => {
      const ruleWeight = c.rules.filter((r) => r.score != null).reduce((s, r) => s + (r.rule.weight ?? 1), 0);
      return c.rules
        .filter((r) => r.score != null && r.score < 1)
        .map((r) => ({ advice: r.rule.advice, gain: Math.round(((1 - r.score!) * (r.rule.weight ?? 1) / ruleWeight) * (c.category.weight / evaluatedWeight) * 100) }));
    })
    .filter((s) => s.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3);

  return { status: 'ok', profile, score, level: score >= 80 ? 'good' : score >= 50 ? 'attention' : 'action', coverage, categories, nextSteps };
}

/** Problems an editor must fix before a profile can be trusted (weights not adding up, bad patterns, empty categories). */
export function validateProfile(profile: HealthProfile): string[] {
  const problems: string[] = [];
  const total = profile.categories.reduce((sum, c) => sum + c.weight, 0);
  if (Math.abs(total - 1) > 0.001) problems.push(`Category weights add up to ${Math.round(total * 100)}%, not 100%.`);
  if (profile.max_age_months != null && profile.max_age_months <= profile.min_age_months) problems.push('The age range is empty.');
  for (const c of profile.categories) {
    if (c.rules.length === 0) problems.push(`Category "${c.key}" has no rules.`);
    for (const r of c.rules) {
      if (r.match) { try { new RegExp(r.match, 'i'); } catch { problems.push(`Rule "${r.id}" has an invalid match pattern.`); } }
    }
  }
  return problems;
}
