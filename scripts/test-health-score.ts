// Run: npx tsx scripts/test-health-score.ts
// Tests the health score engine against the bundled profiles. No test framework needed.
import profilesJson from '../src/lib/health-score/default-profiles.json';
import { ageInMonths, computeHealthScore, evaluateRule, selectProfile, validateProfile } from '../src/lib/health-score/engine';
import type { HealthData, HealthProfile, Rule } from '../src/lib/health-score/types';

const profiles = profilesJson as HealthProfile[];
const TODAY = new Date('2026-09-28T12:00:00Z');
const daysAgo = (n: number) => new Date(TODAY.getTime() - n * 86_400_000).toISOString();
const inDays = (n: number) => daysAgo(-n);
const empty: HealthData = { vaccinations: [], vet_visits: [], medications: [], documents: [] };

let failed = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail !== undefined ? ` — ${JSON.stringify(detail)}` : ''}`);
}

// ---------- profiles are valid data ----------
for (const p of profiles) check(`profile ${p.id} is valid`, validateProfile(p).length === 0, validateProfile(p));
check('broken weights are detected', validateProfile({ ...profiles[1], categories: profiles[1].categories.slice(1) }).length > 0);

// ---------- profile selection (data lookup, species spelling, age) ----------
check('"Dog" with age 0 → puppy', selectProfile({ species: 'Dog', age: 0 }, profiles, TODAY)?.id === 'dog-puppy');
check('dog age 3 → adult', selectProfile({ species: 'dog', age: 3 }, profiles, TODAY)?.id === 'dog-adult');
check('dog age 10 → senior', selectProfile({ species: 'dog', age: 10 }, profiles, TODAY)?.id === 'dog-senior');
check('birthday wins over age', selectProfile({ species: 'cat', age: 5, birthday: '2026-03-01' }, profiles, TODAY)?.id === 'cat-kitten');
check('cat 11 years → senior', selectProfile({ species: 'cat', age: 11 }, profiles, TODAY)?.id === 'cat-senior');
check('bird has one profile for all ages', selectProfile({ species: 'bird', age: 20 }, profiles, TODAY)?.id === 'bird-adult');
check('unknown species → no profile', computeHealthScore({ species: 'other', age: 2 }, empty, profiles, TODAY).status === 'no_profile');
check('age in months from birthday', ageInMonths({ birthday: '2025-09-28' }, TODAY) === 12);

// ---------- "unknown is not bad" ----------
check('no records at all → no_data (not a low score)', computeHealthScore({ species: 'dog', age: 3 }, empty, profiles, TODAY).status === 'no_data');

// ---------- a well-followed adult dog scores 100 ----------
const perfect = computeHealthScore(
  { species: 'dog', age: 4, microchip: '250269812345678', weight: 22 },
  { ...empty, vaccinations: [{ vaccine: 'Rabies', date: daysAgo(100), next_due: inDays(265) }], vet_visits: [{ date: daysAgo(100), reason: 'Annual check-up' }] },
  profiles, TODAY,
);
check('well-followed adult dog → 100, good', perfect.status === 'ok' && perfect.score === 100 && perfect.level === 'good', perfect.status === 'ok' && { score: perfect.score });
check('categories with nothing to check (no treatment, no document) are left out', perfect.status === 'ok' && perfect.categories.filter((c) => c.score == null).map((c) => c.category.key).join() === 'medication,documents');

// ---------- the demo senior dog (records from 2024) is overdue ----------
const luna = computeHealthScore(
  { species: 'Dog', age: 8, birthday: '2017-09-05', microchip: 'LAB-123456789', weight: 28 },
  {
    ...empty,
    vaccinations: [
      { vaccine: 'Rabies', date: '2024-03-15', next_due: '2025-03-15' },
      { vaccine: 'DHPP', date: '2024-02-20', next_due: '2025-02-20' },
    ],
    medications: [{ name: 'Joint Supplement', start_date: '2024-02-15' }],
    vet_visits: [{ date: '2024-03-15', reason: 'Annual checkup' }],
  },
  profiles, TODAY,
);
check('overdue senior dog → senior profile, low score', luna.status === 'ok' && luna.profile.id === 'dog-senior' && luna.score < 50 && luna.level === 'action', luna.status === 'ok' && { id: luna.profile.id, score: luna.score });
check('…with the vet visit as the top next step', luna.status === 'ok' && luna.nextSteps.length > 0 && /vet/i.test(luna.nextSteps[0].advice.en), luna.status === 'ok' && luna.nextSteps);

// ---------- rule behaviour ----------
const notOverdue = profiles[1].categories[0].rules[0] as Rule;
check('a booster supersedes the old due date', evaluateRule(notOverdue, {}, { ...empty, vaccinations: [
  { vaccine: 'Rabies', date: daysAgo(500), next_due: daysAgo(135) },
  { vaccine: 'rabies', date: daysAgo(20), next_due: inDays(345) },
] }, TODAY) === 1);
check('10 days late with 30 days grace → partial credit', Math.abs((evaluateRule(notOverdue, {}, { ...empty, vaccinations: [{ vaccine: 'Rabies', date: daysAgo(375), next_due: daysAgo(10) }] }, TODAY) ?? -1) - 2 / 3) < 0.01);
const review = profiles[1].categories.find((c) => c.key === 'medication')!.rules[0];
check('finished treatment → nothing to review', evaluateRule(review, {}, { ...empty, medications: [{ name: 'Antibiotic', start_date: daysAgo(60), end_date: daysAgo(50) }] }, TODAY) === null);
check('ongoing treatment, no vet visit for 400 days → 0', evaluateRule(review, {}, { ...empty, medications: [{ name: 'Insulin', start_date: daysAgo(400) }], vet_visits: [{ date: daysAgo(400) }] }, TODAY) === 0);
const badPattern: Rule = { id: 'x', type: 'exists', source: 'vaccinations', match: '(unclosed', advice: { en: '', fr: '' } };
check('an invalid pattern in the data does not crash', evaluateRule(badPattern, {}, { ...empty, vaccinations: [{ vaccine: 'Rabies' }] }, TODAY) === 0);

// ---------- once records exist, a missing vet visit is a real gap (flagged), not "unknown" ----------
const bird = computeHealthScore({ species: 'bird', age: 3 }, { ...empty, documents: [{ doc_type: 'other', expires_on: inDays(30) }] }, profiles, TODAY);
check('bird with a document but no vet visit → low score, vet visit advised first', bird.status === 'ok' && bird.level === 'action' && /vet/i.test(bird.nextSteps[0]?.advice.en ?? ''), bird);

// ---------- too little evaluable data → no misleading score ----------
const mostlyOptional: HealthProfile = { ...profiles[1], id: 'test', categories: [
  { key: 'a', label: { en: 'A', fr: 'A' }, weight: 0.7, rules: [{ id: 'a', type: 'exists', source: 'vet_visits', optional: true, advice: { en: '', fr: '' } }] },
  { key: 'b', label: { en: 'B', fr: 'B' }, weight: 0.3, rules: [{ id: 'b', type: 'exists', source: 'documents', advice: { en: '', fr: '' } }] },
] };
const thin = computeHealthScore({ species: 'dog', age: 3 }, { ...empty, documents: [{ doc_type: 'other' }] }, [mostlyOptional], TODAY);
check('only 30% of the weight evaluable → insufficient data, no score', thin.status === 'insufficient_data', thin.status);

console.log(`\n${failed ? `${failed} FAILED` : 'All tests passed'}`);
if (failed) throw new Error(`${failed} test(s) failed`);
