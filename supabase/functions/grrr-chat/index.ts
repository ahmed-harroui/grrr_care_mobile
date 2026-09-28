// GRRR Care AI assistant: grounds Claude in the pet profile + knowledge base.
// Secrets: ANTHROPIC_API_KEY (required), CHAT_DAILY_LIMIT (optional, default 30), CHAT_MODEL (optional).
// Deploy with --no-verify-jwt: the user is verified below, which works with both legacy and new API keys.
// Questions are also sent to the website's Sanity queue when its secrets are set (see question-queue.ts).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { queueQuestion, questionQueueEnabled } from './question-queue.ts';

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

type Mode = 'care' | 'pet_voice' | 'cute';
type Lang = 'fr' | 'en';
interface Turn {
  role: 'user' | 'assistant';
  text: string;
}

const MODEL = Deno.env.get('CHAT_MODEL') ?? 'claude-haiku-4-5-20251001';
const DAILY_LIMIT = Number(Deno.env.get('CHAT_DAILY_LIMIT') ?? 30);
const MAX_MESSAGE = 1000;
const MAX_HISTORY = 6;
// Size caps for the cached prompt: knowledge entries per species, and the content of each pet document
const MAX_KNOWLEDGE_CHARS = 80_000;
const MAX_DOC_CONTENT = 6_000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODE_STYLE: Record<Mode, string> = {
  care: 'Tone: warm, clear and practical, like a caring vet nurse.',
  pet_voice:
    'Tone: speak in the first person AS the pet ({name}, a {species}), playful and endearing. The information must stay accurate, and any safety advice must be stated plainly.',
  cute: 'Tone: very affectionate and cheerful, with a few emojis. The information must stay accurate.',
};

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

// Identical for every owner of the same species, so it is cached and billed at ~10% after the first message
function knowledgePrompt(docs: any[], guides: any[]) {
  const knowledge = docs.map((d, i) => `[${i + 1}] ${d.title} (${d.category})\n${d.content}`).join('\n\n');
  const emergencies = guides
    .map(
      (g, i) =>
        `[E${i + 1}] ${g.title}\nSymptoms: ${list(g.symptoms)}\nImmediate actions: ${list(g.immediate_actions)}\nCall the vet when: ${g.when_to_call_vet}`
    )
    .join('\n\n');

  return `You are GRRR, the pet-care assistant of the GRRR Care app. You help owners look after their pet's health, nutrition, behaviour and prevention.

Rules:
- Base your answer on the KNOWLEDGE and EMERGENCY GUIDES below and cite them inline like [1] or [E1]. If they don't cover the question, say so briefly and give only general, safe guidance.
- You are not a veterinarian: never diagnose, never give medication doses. If the message suggests an emergency (poisoning, breathing trouble, heavy bleeding, collapse, seizures, suspected fracture, not eating or drinking for a long time...), your FIRST sentence must tell the owner to contact a vet or emergency clinic right away.
- The pet's full profile, health records and documents follow at the end. Use them to answer directly: never ask for something they already contain (age, weight, breed, vaccines, treatments...). Ask a follow-up question only when the answer truly depends on something missing, and then ask just one.
- Point out anything in the records that matters for the question: an overdue vaccine, an ongoing treatment, an allergy, an expired passport for a travel question.
- Under OFFICIAL DOCUMENTS, "Content of the file" is what was read in the owner's uploaded papers (passport, certificates...). Treat it as the pet's records, with the same weight as the fields above.
- Plain text only: no markdown, no bold, no headings; use "•" for lists.

KNOWLEDGE
${knowledge || '(none for this species)'}

EMERGENCY GUIDES
${emergencies || '(none for this species)'}`;
}

function replyPrompt(pet: Record<string, any>, mode: Mode, lang: Lang) {
  return `Reply in ${lang === 'fr' ? 'French' : 'English'}, in 60 to 150 words.
${MODE_STYLE[mode].replace('{name}', pet.pet_name).replace('{species}', pet.species)}`;
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
  const mode: Mode = ['care', 'pet_voice', 'cute'].includes(body?.style) ? body.style : 'care';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > MAX_MESSAGE || typeof body?.petId !== 'string') {
    return json({ error: 'Invalid request' }, 400);
  }
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
  if (used > DAILY_LIMIT) return json({ error: MESSAGES.limit[lang], code: 'daily_limit' }, 429);

  const species = String(pet.species || '').toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  // Stable ordering matters: the knowledge block is cached, and any reordering would miss the cache
  const [allDocs, allGuides, vaccinations, medications, visits, documents] = await Promise.all([
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
  const docs: any[] = [];
  let knowledgeChars = 0;
  for (const d of forSpecies(allDocs.data)) {
    knowledgeChars += d.title.length + d.content.length;
    if (knowledgeChars > MAX_KNOWLEDGE_CHARS) {
      console.warn(`knowledge over ${MAX_KNOWLEDGE_CHARS} chars for ${species}: later entries left out`);
      break;
    }
    docs.push(d);
  }
  const guides = forSpecies(allGuides.data).slice(0, 5);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      // Two cache breakpoints: the shared knowledge (per species), then this pet's context (reused across the chat)
      system: [
        { type: 'text', text: knowledgePrompt(docs, guides), cache_control: { type: 'ephemeral' } },
        { type: 'text', text: petContext(pet, records, today), cache_control: { type: 'ephemeral' } },
        { type: 'text', text: replyPrompt(pet, mode, lang) },
      ],
      messages: buildMessages(history, message),
    }),
  });

  if (!res.ok) {
    console.error('anthropic error', res.status, await res.text());
    return json({ error: MESSAGES.failed[lang] }, 502);
  }

  const data = await res.json();
  const u = data.usage ?? {};
  console.log(
    `usage input=${u.input_tokens} cache_read=${u.cache_read_input_tokens ?? 0} cache_write=${u.cache_creation_input_tokens ?? 0} output=${u.output_tokens}`
  );
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

  // Runs after the response is sent so the owner never waits on it
  if (questionQueueEnabled) {
    EdgeRuntime.waitUntil(queueQuestion(message, apiKey, MODEL).catch(e => console.error('question queue error', e)));
  }

  return json({ response: text, sources, style: mode, remaining: Math.max(0, DAILY_LIMIT - used) });
});
