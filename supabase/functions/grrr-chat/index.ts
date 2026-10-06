// GRRR Care AI assistant: grounds Claude in the pet profile + knowledge base.
// Secrets: ANTHROPIC_API_KEY (required), CHAT_DAILY_LIMIT (optional, default 30), CHAT_MODEL (optional).
// Deploy with --no-verify-jwt: the user is verified below, which works with both legacy and new API keys.
// Questions are also sent to the website's Sanity queue when its secrets are set (see question-queue.ts).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { queueQuestion, questionQueueEnabled } from './question-queue.ts';

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

type Mode = 'vet' | 'nutrition' | 'behavior';
type Lang = 'fr' | 'en';
interface Turn {
  role: 'user' | 'assistant';
  text: string;
}

const MODEL = Deno.env.get('CHAT_MODEL') ?? 'claude-haiku-4-5-20251001';
const DAILY_LIMIT = Number(Deno.env.get('CHAT_DAILY_LIMIT') ?? 30);
// A month of AI assistant won with the daily gifts (profiles.care_ai_until, GRRRR migration 023).
const PREMIUM_DAILY_LIMIT = Number(Deno.env.get('CHAT_PREMIUM_DAILY_LIMIT') ?? 300);
const MAX_MESSAGE = 1000;
const MAX_HISTORY = 6;
// Size caps for the cached prompt: knowledge entries per species, and the content of each pet document
const MAX_KNOWLEDGE_CHARS = 80_000;
const MAX_DOC_CONTENT = 6_000;
// Past MAX_KNOWLEDGE_CHARS (the site keeps adding guides and upvoted threads), the prompt holds a catalogue of
// titles and summaries instead, and the model reads the full text of the few entries it needs with a tool
const MAX_ENTRIES_READ = 4;
const SUMMARY_CHARS = 200;

const READ_TOOL = {
  name: 'read_knowledge',
  description: `Returns the full text of KNOWLEDGE entries, by their number. Call it once, before answering, with the ${MAX_ENTRIES_READ} or fewer entries that could help with the question.`,
  input_schema: {
    type: 'object',
    properties: { entries: { type: 'array', items: { type: 'integer' }, maxItems: MAX_ENTRIES_READ } },
    required: ['entries'],
  },
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// The three specialities the owner picks from in the app. They change what the answer focuses on, not the rules above.
const MODE_FOCUS: Record<Mode, string> = {
  vet: `Speciality: HEALTH, like an experienced vet nurse. Symptoms, illnesses, parasites, vaccines, prevention, the treatments and visits in the records, recovery and ageing.
Explain what the signs most likely point to, what the owner can do now, and what to watch over the next hours or days. Mention a vet visit only when the situation calls for it, with how soon.
Tone: calm, assured and reassuring.`,
  nutrition: `Speciality: NUTRITION, like a pet nutritionist. What and how much to feed this pet for its species, age, weight, neutering and allergies; meal rhythm, treats, water, changing food, weight gain or loss, foods that are toxic.
Give quantities and frequencies only when the knowledge supports them, and tie them to this pet's weight and age. Mention any allergy on file before recommending a food.
Tone: practical and concrete.`,
  behavior: `Speciality: BEHAVIOUR, like a pet behaviourist. Psychology and emotions, body language (ears, tail, posture, eyes), movements and gait, sounds (barking, meowing, purring, growling, whining), habits, training, play, enrichment and socialisation.
Explain what {name} is probably feeling or trying to say, why a {species} does this, and what the owner can do, step by step.
A sudden change in behaviour or movement (limping, hiding, aggression, restlessness) can mean pain: say so and advise a vet check.
Tone: warm and curious, on the pet's side.`,
};
const MODE_NAMES: Record<Lang, Record<Mode, string>> = {
  fr: { vet: 'Vétérinaire', nutrition: 'Nutrition', behavior: 'Comportement' },
  en: { vet: 'Vet', nutrition: 'Nutrition', behavior: 'Behaviour' },
};
const MODES = Object.keys(MODE_FOCUS) as Mode[];

const MESSAGES = {
  limit: { fr: `Tu as atteint la limite de ${DAILY_LIMIT} messages pour aujourd'hui. Reviens demain 🐾`, en: `You've reached today's limit of ${DAILY_LIMIT} messages. Come back tomorrow 🐾` },
  failed: { fr: "GRRR n'a pas pu répondre. Réessaie dans un instant.", en: "GRRR couldn't answer. Please try again in a moment." },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const list = (v: unknown) => (Array.isArray(v) ? v.join('; ') : '');
const day = (v: unknown) => (v ? String(v).slice(0, 10) : '');

const DOC_LABELS: Record<string, string> = {
  passport: 'Pet passport',
  microchip_certificate: 'Microchip / ID certificate',
  adoption: 'Adoption certificate',
  ownership: 'Ownership document',
  registration: 'Registration document',
  import_export: 'Import / export document',
  other: 'Certificate',
};

function ageFromBirthday(birthday: string, today: string) {
  const [by, bm, bd] = birthday.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  let months = (ty - by) * 12 + (tm - bm) - (td < bd ? 1 : 0);
  if (months < 0) return '';
  const years = Math.floor(months / 12);
  months %= 12;
  return years ? `${years} y ${months} mo` : `${months} months`;
}

interface PetRecords {
  vaccinations: any[];
  medications: any[];
  visits: any[];
  documents: any[];
}

// Everything the owner filled in, so the model can answer without asking back.
// Identifier numbers and owner contact details are left out: they never change an answer.
function petContext(pet: Record<string, any>, records: PetRecords, today: string) {
  const birthday = day(pet.birthday);
  const age = birthday ? ageFromBirthday(birthday, today) : pet.age ? `${pet.age} years` : '';
  const yesNo = (v: unknown) => (v ? 'yes' : 'no');
  const profile = [
    `Name: ${pet.pet_name}`,
    `Species: ${pet.species}`,
    pet.breed && `Breed: ${pet.breed}`,
    pet.gender && `Sex: ${pet.gender === 'F' ? 'female' : pet.gender === 'M' ? 'male' : pet.gender}`,
    age && `Age: ${age}${birthday ? ` (born ${birthday})` : ''}`,
    pet.weight && `Weight: ${pet.weight} kg`,
    pet.sterilized != null && `Neutered/spayed: ${yesNo(pet.sterilized)}`,
    pet.color && `Coat/color: ${pet.color}`,
    pet.distinguishing_marks && `Distinguishing marks: ${pet.distinguishing_marks}`,
    `Microchipped: ${yesNo(pet.microchip)}`,
    pet.tattoo && 'Tattooed: yes',
    pet.registration_number && 'Registered: yes',
    pet.allergies && `Allergies: ${pet.allergies}`,
    pet.care_notes && `Owner notes: ${pet.care_notes}`,
  ];

  const vaccines = records.vaccinations.map(v => {
    const due = day(v.next_due);
    return `• ${v.vaccine}: given ${day(v.date)}${due ? `, next due ${due}${due < today ? ' (OVERDUE)' : ''}` : ''}`;
  });
  const isCurrent = (m: any) => !m.end_date || day(m.end_date) >= today;
  const meds = records.medications.map(
    m =>
      `• ${m.name}${m.dosage ? `, ${m.dosage}` : ''}${m.frequency ? `, ${m.frequency}` : ''} (${
        isCurrent(m) ? `ongoing since ${day(m.start_date)}` : `${day(m.start_date)} to ${day(m.end_date)}`
      })${m.notes ? ` - ${m.notes}` : ''}`
  );
  const visits = records.visits.map(
    v => `• ${day(v.date)}${v.reason ? `: ${v.reason}` : ''}${v.diagnosis ? ` - diagnosis: ${v.diagnosis}` : ''}`
  );
  const documents = records.documents.map(d => {
    const expires = day(d.expires_on);
    const line = `• ${d.title || DOC_LABELS[d.doc_type] || d.doc_type}${d.issued_on ? `, issued ${day(d.issued_on)}` : ''}${
      expires ? `, expires ${expires}${expires < today ? ' (EXPIRED)' : ''}` : ''
    }`;
    // What grrr-doc-read took from the attached file (summary only for files read before ai_content existed)
    const read = d.ai_content || d.ai_summary;
    const content = read ? `\n  Content of the file:\n${String(read).slice(0, MAX_DOC_CONTENT).replace(/^/gm, '    ')}` : '';
    return line + content;
  });

  const section = (title: string, lines: string[]) => `${title}\n${lines.join('\n') || '(none recorded)'}`;
  return [
    `Today: ${today}`,
    section('PET PROFILE', profile.filter(Boolean) as string[]),
    section('VACCINATIONS', vaccines),
    section('MEDICATIONS (as recorded by the owner or vet)', meds),
    section('RECENT VET VISITS', visits),
    section('OFFICIAL DOCUMENTS', documents),
  ].join('\n\n');
}

const summaryOf = (d: any) => String(d.content).replace(/\s+/g, ' ').slice(0, SUMMARY_CHARS);

// Identical for every owner of the same species, so it is cached and billed at ~10% after the first message
function knowledgePrompt(docs: any[], guides: any[], catalogue: boolean) {
  const knowledge = catalogue
    ? docs.map((d, i) => `[${i + 1}] ${d.title} (${d.category}): ${summaryOf(d)}`).join('\n')
    : docs.map((d, i) => `[${i + 1}] ${d.title} (${d.category})\n${d.content}`).join('\n\n');
  const emergencies = guides
    .map(
      (g, i) =>
        `[E${i + 1}] ${g.title}\nSymptoms: ${list(g.symptoms)}\nImmediate actions: ${list(g.immediate_actions)}\nCall the vet when: ${g.when_to_call_vet}`
    )
    .join('\n\n');

  return `You are GRRR, the assistant of the GRRR Care app: an expert friend who knows animals inside out. You help owners with their pet's health, nutrition, behaviour, training, prevention and daily life, and you also answer any other question they ask.

Who you are:
- Confident and warm. Answer the question that was asked, directly, from your own expertise: explain, give concrete advice and the most likely explanations, like a seasoned professional who has seen it all. No hedging, no long disclaimers, no "I'm just an AI".
- You answer everything. A question about the pet, about animals in general, or about anything else (everyday life, travel with a pet, a word, an idea...): give a real, useful answer. Never refuse a harmless question and never answer only with a redirection.
- A vet visit is advice you give when it is truly needed (an emergency, worrying or lasting symptoms, something that needs an exam, a prescription or a test), not a reflex: most questions are answered fully without one. When you do recommend it, say why and how soon, in one sentence, after the answer.

Rules:
- Use the KNOWLEDGE and EMERGENCY GUIDES below when they help and cite them inline like [1] or [E1]. When they don't cover the question, answer from your own knowledge just as confidently, without saying they don't cover it.${
    catalogue
      ? '\n- KNOWLEDGE only lists titles and summaries. When entries may help, first call read_knowledge with their numbers, then answer from their full text.'
      : ''
  }
- Entries in the "community" category are tips upvoted by owners on the Grr website, not vet-reviewed: use them as practical ideas, never for health decisions.
- Health: say what the signs most likely point to and what the owner can do now, but don't present it as a certain diagnosis, and never give a medication dose (that comes from the vet who prescribes it). If the message suggests an emergency (poisoning, breathing trouble, heavy bleeding, collapse, seizures, suspected fracture, not eating or drinking for a long time...), your FIRST sentence must tell the owner to contact a vet or emergency clinic right away.
- The pet's full profile, health records and documents follow at the end. Use them to answer directly: never ask for something they already contain (age, weight, breed, vaccines, treatments...). Ask a follow-up question only when the answer truly depends on something missing, and then ask just one.
- Point out anything in the records that matters for the question: an overdue vaccine, an ongoing treatment, an allergy, an expired passport for a travel question.
- Under OFFICIAL DOCUMENTS, "Content of the file" is what was read in the owner's uploaded papers (passport, certificates...). Treat it as the pet's records, with the same weight as the fields above.
- Plain text only: no markdown, no bold, no headings; use "•" for lists.

KNOWLEDGE
${knowledge || '(none for this species)'}

EMERGENCY GUIDES
${emergencies || '(none for this species)'}`;
}

// Establishments of the app's map that the assistant may recommend: vet clinics first, nearest first when the app
// shares the owner's position. Coordinates never reach the model, only distances.
const MAX_PARTNERS = 6;
const MAX_PARTNER_KM = 100;
const PARTNER_KINDS: Record<string, string> = {
  clinic: 'veterinary clinic',
  pharmacy: 'pharmacy',
  supplies: 'pet shop',
  insurance: 'pet insurance',
  food: 'pet food',
  grooming: 'groomer',
};
interface Position {
  latitude: number;
  longitude: number;
}

function distanceKm(from: Position, to: { latitude: number | null; longitude: number | null }) {
  if (to.latitude == null || to.longitude == null) return null;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const h =
    Math.sin(rad(to.latitude - from.latitude) / 2) ** 2 +
    Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(rad(to.longitude - from.longitude) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function partnersToSuggest(rows: any[], position: Position | null) {
  const all = rows
    .map(p => ({ ...p, distance: position ? distanceKm(position, p) : null }))
    // Too far to be "near": better to send the owner to the map than to a clinic in another region
    .filter(p => !position || (p.distance != null && p.distance <= MAX_PARTNER_KM))
    .sort((a, b) =>
      position ? a.distance - b.distance : Number(b.is_featured) - Number(a.is_featured) || (b.rating ?? 0) - (a.rating ?? 0)
    );
  const clinics = all.filter(p => p.category === 'clinic').slice(0, 3);
  return [...clinics, ...all.filter(p => p.category !== 'clinic').slice(0, MAX_PARTNERS - clinics.length)];
}

function partnersPrompt(partners: any[], located: boolean) {
  const map = 'the map tab of the app, which lists the vets and partners around them';
  if (!partners.length) {
    return `PARTNERS
(none ${located ? 'near the owner' : 'available'}) When the owner needs a vet or a service, point them to ${map}. Never name an establishment.`;
  }
  const lines = partners.map((p, i) => {
    const km = p.distance == null ? '' : ` — ${p.distance < 10 ? p.distance.toFixed(1) : Math.round(p.distance)} km away`;
    return `[P${i + 1}] ${p.name} — ${PARTNER_KINDS[p.category] ?? p.category}${km}${p.address ? ` — ${p.address}` : ''}`;
  });
  return `PARTNERS (establishments on the GRRR Care map${
    located ? ', nearest to the owner first' : '; the owner has not shared their position, so distances are unknown'
  })
${lines.join('\n')}
- When the owner should see a vet, asks where to go, or needs a service one of these offers, recommend the best fitting one by name${
    located ? ' with its distance' : ''
  } and cite it like [P1]. Two at most. The app shows a card with its phone and directions, so don't write the phone number or the address.
- In an emergency, name the nearest veterinary clinic right after telling the owner to contact a vet.
- Never mention an establishment that is not in this list, and don't recommend one when the question doesn't call for it.${
    located ? '' : ' Add that the map tab of the app shows the nearest ones.'
  }`;
}

function replyPrompt(pet: Record<string, any>, mode: Mode, lang: Lang) {
  const others = MODES.filter(m => m !== mode).map(m => `"${MODE_NAMES[lang][m]}"`).join(' or ');
  // Kept out of the cached blocks: the knowledge and the pet context are shared by the three modes
  return `Reply in ${lang === 'fr' ? 'French' : 'English'}, in 60 to 150 words.
The owner picked the "${MODE_NAMES[lang][mode]}" mode of the chat (the other modes are ${others}; use these exact names).
${MODE_FOCUS[mode].replaceAll('{name}', pet.pet_name).replaceAll('{species}', pet.species)}
If the question belongs to another speciality, or to no speciality at all, answer it fully anyway; for another speciality you may add one short sentence suggesting that mode for more detail. An emergency is always answered in full, in any mode.`;
}

// Claude expects alternating turns starting with the user
function buildMessages(history: Turn[], message: string) {
  const turns = [...history.slice(-MAX_HISTORY), { role: 'user' as const, text: message }];
  const merged: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const t of turns) {
    if (!merged.length && t.role !== 'user') continue;
    const last = merged[merged.length - 1];
    if (last && last.role === t.role) last.content += `\n\n${t.text}`;
    else merged.push({ role: t.role, content: t.text });
  }
  return merged;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY is not configured' }, 500);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const { data: auth } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  const user = auth?.user;
  if (!user) return json({ error: 'Not signed in' }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const lang: Lang = body?.language === 'en' ? 'en' : 'fr';
  // Older app versions still send the former tone modes (care, pet_voice, cute): they get the vet speciality
  const mode: Mode = MODES.includes(body?.style) ? body.style : 'vet';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > MAX_MESSAGE || typeof body?.petId !== 'string') {
    return json({ error: 'Invalid request' }, 400);
  }
  // Sent by the app only when the owner already allowed location: used to sort partners by distance, never stored
  const at = body?.location;
  const position: Position | null =
    typeof at?.latitude === 'number' && typeof at?.longitude === 'number' && Math.abs(at.latitude) <= 90 && Math.abs(at.longitude) <= 180
      ? { latitude: at.latitude, longitude: at.longitude }
      : null;
  const history: Turn[] = Array.isArray(body.history)
    ? body.history
        .filter((t: any) => (t?.role === 'user' || t?.role === 'assistant') && typeof t?.text === 'string')
        .map((t: any) => ({ role: t.role, text: t.text.slice(0, 2000) }))
    : [];

  // Every signed-in user can read all pets (GRRRR discovery policy), so ownership is checked explicitly
  const { data: pet } = await admin.from('pets').select('*').eq('id', body.petId).maybeSingle();
  if (!pet || pet.owner_id !== user.id) return json({ error: 'Pet not found' }, 404);

  const { data: used, error: usageError } = await admin.rpc('increment_chat_usage', { p_user: user.id });
  if (usageError) {
    console.error('usage error', usageError);
    return json({ error: MESSAGES.failed[lang] }, 500);
  }
  if (used > DAILY_LIMIT) {
    const { data: profile } = await admin.from('profiles').select('care_ai_until').eq('user_id', user.id).maybeSingle();
    const premium = profile?.care_ai_until && new Date(profile.care_ai_until).getTime() > Date.now();
    if (!premium || used > PREMIUM_DAILY_LIMIT) return json({ error: MESSAGES.limit[lang], code: 'daily_limit' }, 429);
  }

  const species = String(pet.species || '').toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  // Stable ordering matters: the knowledge block is cached, and any reordering would miss the cache
  const [allDocs, allGuides, vaccinations, medications, visits, documents, allPartners] = await Promise.all([
    // Ordered by id as a tiebreak so the cached knowledge block stays byte-identical between messages
    admin.from('knowledge_documents').select('title, category, content, species').eq('is_published', true).order('title').order('id'),
    admin
      .from('emergency_guides')
      .select('title, symptoms, immediate_actions, when_to_call_vet, species')
      .eq('is_published', true)
      .order('title')
      .order('id'),
    admin.from('vaccinations').select('vaccine, date, next_due').eq('pet_id', pet.id).order('date', { ascending: false }).limit(15),
    admin
      .from('medications')
      .select('name, dosage, frequency, start_date, end_date, notes')
      .eq('pet_id', pet.id)
      .order('start_date', { ascending: false })
      .limit(10),
    admin.from('vet_visits').select('date, reason, diagnosis').eq('pet_id', pet.id).order('date', { ascending: false }).limit(5),
    // Table comes from migration 010; a missing table just means no documents
    admin
      .from('pet_documents')
      .select('doc_type, title, issued_on, expires_on, ai_summary, ai_content')
      .eq('pet_id', pet.id)
      .order('created_at'),
    admin
      .from('partners')
      .select('id, name, category, address, phone, website, latitude, longitude, rating, is_featured')
      .eq('is_published', true),
  ]);
  const records: PetRecords = {
    vaccinations: vaccinations.data ?? [],
    medications: medications.data ?? [],
    visits: visits.data ?? [],
    documents: documents.data ?? [],
  };
  if (allDocs.error || allGuides.error) console.error('knowledge query error', allDocs.error ?? allGuides.error);
  // Entries with no species (from reference files about pets in general) apply to every pet
  const forSpecies = (rows: any[] | null) => {
    const isFor = (r: any) => Array.isArray(r.species) && r.species.some((s: string) => species.includes(s) || s.includes(species));
    const general = (r: any) => !Array.isArray(r.species) || r.species.length === 0;
    const all = rows ?? [];
    return all.some(isFor) ? all.filter(r => isFor(r) || general(r)) : all;
  };
  const allForSpecies = forSpecies(allDocs.data);
  const fullChars = allForSpecies.reduce((n, d) => n + d.title.length + d.content.length, 0);
  // Small knowledge base: every entry in full. Larger: a catalogue, and the model reads what it needs
  const catalogue = fullChars > MAX_KNOWLEDGE_CHARS;
  const docs: any[] = [];
  let knowledgeChars = 0;
  for (const d of allForSpecies) {
    knowledgeChars += d.title.length + (catalogue ? summaryOf(d).length : d.content.length);
    if (knowledgeChars > MAX_KNOWLEDGE_CHARS) {
      console.warn(`knowledge over ${MAX_KNOWLEDGE_CHARS} chars for ${species}: later entries left out`);
      break;
    }
    docs.push(d);
  }
  const guides = forSpecies(allGuides.data).slice(0, 5);
  const partners = partnersToSuggest(allPartners.data ?? [], position);

  const request = {
    model: MODEL,
    max_tokens: 500,
    ...(catalogue ? { tools: [READ_TOOL] } : {}),
    // Two cache breakpoints: the shared knowledge (per species), then this pet's context (reused across the chat)
    system: [
      { type: 'text', text: knowledgePrompt(docs, guides, catalogue), cache_control: { type: 'ephemeral' } },
      { type: 'text', text: petContext(pet, records, today), cache_control: { type: 'ephemeral' } },
      { type: 'text', text: `${replyPrompt(pet, mode, lang)}\n\n${partnersPrompt(partners, Boolean(position))}` },
    ],
  };
  const messages: any[] = buildMessages(history, message);

  async function callClaude(extra: Record<string, unknown> = {}) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ...request, ...extra, messages }),
    });
    if (!res.ok) {
      console.error('anthropic error', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const u = data.usage ?? {};
    console.log(
      `usage input=${u.input_tokens} cache_read=${u.cache_read_input_tokens ?? 0} cache_write=${u.cache_creation_input_tokens ?? 0} output=${u.output_tokens}`
    );
    return data;
  }

  let data = await callClaude();
  if (data?.stop_reason === 'tool_use') {
    // One reading round: the entries asked for, then an answer (tools stay defined so the cached prefix still matches)
    const results = (data.content ?? [])
      .filter((b: any) => b.type === 'tool_use')
      .map((b: any) => {
        const wanted: number[] = Array.isArray(b.input?.entries) ? b.input.entries.slice(0, MAX_ENTRIES_READ) : [];
        const read = wanted
          .map(n => docs[n - 1] && `[${n}] ${docs[n - 1].title}\n${docs[n - 1].content}`)
          .filter(Boolean)
          .join('\n\n');
        return { type: 'tool_result', tool_use_id: b.id, content: read || 'No entry with these numbers.' };
      });
    messages.push({ role: 'assistant', content: data.content }, { role: 'user', content: results });
    data = await callClaude({ tool_choice: { type: 'none' } });
  }
  if (!data) return json({ error: MESSAGES.failed[lang] }, 502);

  const text = (data.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
    .trim();

  const cited = new Set([...text.matchAll(/\[(E?)(\d+)\]/g)].map(m => `${m[1]}${m[2]}`));
  const sources = [
    ...docs.filter((_, i) => cited.has(String(i + 1))).map(d => d.title),
    ...guides.filter((_, i) => cited.has(`E${i + 1}`)).map(g => `🚨 ${g.title}`),
  ];

  // Partners the answer recommends: the app shows them as cards, so their [P1] marks leave the text
  const recommended = new Set([...text.matchAll(/\[P(\d+)\]/g)].map(m => Number(m[1])));
  const suggestedPartners = partners
    .filter((_, i) => recommended.has(i + 1))
    .map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      address: p.address,
      phone: p.phone,
      latitude: p.latitude,
      longitude: p.longitude,
      distance_km: p.distance,
    }));
  const reply = text.replace(/\s*\[P\d+\]/g, '');

  // Runs after the response is sent so the owner never waits on it
  if (questionQueueEnabled) {
    EdgeRuntime.waitUntil(queueQuestion(message, apiKey, MODEL).catch(e => console.error('question queue error', e)));
  }

  return json({ response: reply, sources, partners: suggestedPartners, style: mode, remaining: Math.max(0, DAILY_LIMIT - used) });
});
