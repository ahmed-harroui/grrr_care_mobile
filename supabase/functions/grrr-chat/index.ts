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

function petProfile(pet: Record<string, any>) {
  const lines = [
    `Name: ${pet.pet_name}`,
    `Species: ${pet.species}`,
    pet.breed && `Breed: ${pet.breed}`,
    pet.age && `Age: ${pet.age} years`,
    pet.gender && `Sex: ${pet.gender === 'F' ? 'female' : pet.gender === 'M' ? 'male' : pet.gender}`,
    pet.weight && `Weight: ${pet.weight} kg`,
    pet.sterilized != null && `Neutered/spayed: ${pet.sterilized ? 'yes' : 'no'}`,
    pet.allergies && `Allergies: ${pet.allergies}`,
    pet.care_notes && `Owner notes: ${pet.care_notes}`,
  ];
  return lines.filter(Boolean).join('\n');
}

function systemPrompt(pet: Record<string, any>, mode: Mode, lang: Lang, docs: any[], guides: any[]) {
  const knowledge = docs
    .map(
      (d, i) =>
        `[${i + 1}] ${d.title} (${d.category})\n${d.summary}\n${d.content}` +
        (list(d.key_points) ? `\nKey points: ${list(d.key_points)}` : '') +
        (list(d.warnings) ? `\nWarnings: ${list(d.warnings)}` : '')
    )
    .join('\n\n');
  const emergencies = guides
    .map(
      (g, i) =>
        `[E${i + 1}] ${g.condition} (severity: ${g.severity})\nSymptoms: ${list(g.symptoms)}\nImmediate actions: ${list(g.immediate_actions)}\nDo NOT: ${list(g.do_not_do)}\nCall the vet when: ${g.when_to_call_vet}`
    )
    .join('\n\n');

  return `You are GRRR, the pet-care assistant of the GRRR Care app. You help owners look after their pet's health, nutrition, behaviour and prevention.

Rules:
- Base your answer on the KNOWLEDGE and EMERGENCY GUIDES below and cite them inline like [1] or [E1]. If they don't cover the question, say so briefly and give only general, safe guidance.
- You are not a veterinarian: never diagnose, never give medication doses. If the message suggests an emergency (poisoning, breathing trouble, heavy bleeding, collapse, seizures, suspected fracture, not eating or drinking for a long time...), your FIRST sentence must tell the owner to contact a vet or emergency clinic right away.
- Personalise with the pet profile (species, age, weight, allergies...).
- Reply in ${lang === 'fr' ? 'French' : 'English'}, in 60 to 150 words. Plain text only: no markdown, no bold, no headings; use "•" for lists.
- ${MODE_STYLE[mode].replace('{name}', pet.pet_name).replace('{species}', pet.species)}

PET PROFILE
${petProfile(pet)}

KNOWLEDGE
${knowledge || '(none for this species)'}

EMERGENCY GUIDES
${emergencies || '(none for this species)'}`;
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
  const [{ data: allDocs }, { data: allGuides }] = await Promise.all([
    admin.from('knowledge_documents').select('title, category, summary, content, key_points, warnings, species'),
    admin.from('emergency_guides').select('condition, severity, symptoms, immediate_actions, do_not_do, when_to_call_vet, species'),
  ]);
  const forSpecies = (rows: any[] | null) => {
    const matching = (rows ?? []).filter(r => Array.isArray(r.species) && r.species.some((s: string) => species.includes(s) || s.includes(species)));
    return matching.length ? matching : rows ?? [];
  };
  const docs = forSpecies(allDocs).slice(0, 24);
  const guides = forSpecies(allGuides).slice(0, 5);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 700,
      system: systemPrompt(pet, mode, lang, docs, guides),
      messages: buildMessages(history, message),
    }),
  });

  if (!res.ok) {
    console.error('anthropic error', res.status, await res.text());
    return json({ error: MESSAGES.failed[lang] }, 502);
  }

  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
    .trim();

  const cited = new Set([...text.matchAll(/\[(E?)(\d+)\]/g)].map(m => `${m[1]}${m[2]}`));
  const sources = [
    ...docs.filter((_, i) => cited.has(String(i + 1))).map(d => d.title),
    ...guides.filter((_, i) => cited.has(`E${i + 1}`)).map(g => `🚨 ${g.condition}`),
  ];

  // Runs after the response is sent so the owner never waits on it
  if (questionQueueEnabled) {
    EdgeRuntime.waitUntil(queueQuestion(message, apiKey, MODEL).catch(e => console.error('question queue error', e)));
  }

  return json({ response: text, sources, style: mode, remaining: Math.max(0, DAILY_LIMIT - used) });
});
