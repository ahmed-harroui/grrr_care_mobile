// Feeds the website's Sanity question queue (strategie-ecosysteme-gr) with what owners ask in the app.
// Only questions worth a public guide get in; a question asked again counts one more "ask" instead of being added twice,
// and the site's weekly content engine writes its guide from the most asked question.
// Secrets: SANITY_PROJECT_ID + SANITY_WRITE_TOKEN (Editor token) enable it; SANITY_DATASET is optional (default production).

const PROJECT_ID = Deno.env.get('SANITY_PROJECT_ID');
const TOKEN = Deno.env.get('SANITY_WRITE_TOKEN');
const DATASET = Deno.env.get('SANITY_DATASET') || 'production';
const API = `https://${PROJECT_ID}.api.sanity.io/v2026-09-01/data`;
const MAX_LISTED = 150;

// Same filter as the site: drafts are never part of the queue. A question leaves the queue when its guide is written,
// so what is already covered is read from the guides (drafts included): their title and the question they came from
const STATE = `{
  "pending": *[_type == "question" && !(_id in path("drafts.**"))] | order(_createdAt asc)[0...${MAX_LISTED}] { _id, text },
  "covered": *[_type == "guide"].title + *[_type == "guide"].question
}`;

async function sanity(path: string, init?: RequestInit) {
  const res = await fetch(`${API}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
  });
  if (!res.ok) throw new Error(`sanity ${res.status}: ${await res.text()}`);
  return res.json();
}

function triagePrompt(pending: { text: string }[], covered: string[]) {
  return `Owners write to the assistant of a pet-care app. You decide whether a message deserves a place in the editorial queue: each queued question becomes a full public guide (700 to 1100 words) on the Grr website.

A message deserves it only if ALL of this is true:
- it is a real question about living with or caring for a pet (health, food, behaviour, training, daily life);
- many other owners could have the same question: not something that only concerns this pet's own records, dates, documents or appointment;
- there is enough to say for a useful guide: not a one-word fact, not a yes/no trivia;
- it makes sense on its own, without the rest of the conversation.
Greetings, thanks, tests, small talk, complaints about the app, off-topic or unclear messages never deserve it.

Reply with exactly one line, nothing else:
- SKIP — it does not deserve it, or a GUIDE below already covers it.
- SAME <number> — it asks the same thing as that question of the QUEUE below (same subject and same angle, even if worded differently or in another language).
- NEW <question> — it deserves it and is new. Write ONE general question in English, the way an owner would type it into Google (max 120 characters), for example: NEW How do I stop my dog pulling on the lead? Remove everything personal: names of owners or pets, places, dates.

QUEUE
${pending.map((q, i) => `${i + 1}. ${q.text}`).join('\n') || '(empty)'}

GUIDES
${covered.map(t => `• ${t}`).join('\n') || '(none yet)'}`;
}

const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export const questionQueueEnabled = Boolean(PROJECT_ID && TOKEN);

export async function queueQuestion(message: string, apiKey: string, model: string) {
  // Too short to be a question worth a guide: no need to ask the model
  if (message.trim().split(/\s+/).length < 3) return;

  const { result } = await sanity(`query/${DATASET}?query=${encodeURIComponent(STATE)}`);
  const pending: { _id: string; text: string }[] = result?.pending ?? [];
  const covered: string[] = (result?.covered ?? []).filter(Boolean);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: 100,
      system: triagePrompt(pending, covered),
      messages: [{ role: 'user', content: message }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const verdict = (data.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join(' ')
    .trim();

  const same = verdict.match(/^SAME\s+(\d+)/i);
  const fresh = verdict.match(/^NEW\s+(.+)/is);
  const text = fresh?.[1].trim().replace(/^["“]|["”]$/g, '') ?? '';
  // A question worded exactly like a queued one is the same question, whatever the model said
  const twin = same ? pending[Number(same[1]) - 1] : text ? pending.find(q => normalize(q.text) === normalize(text)) : undefined;

  if (twin) {
    // One more owner asked it: it moves up the queue
    await sanity(`mutate/${DATASET}`, {
      method: 'POST',
      body: JSON.stringify({
        mutations: [{ patch: { id: twin._id, setIfMissing: { asks: 1 } } }, { patch: { id: twin._id, inc: { asks: 1 } } }],
      }),
    });
    return;
  }
  if (!text || text.length < 10 || text.length > 200) return;
  if (covered.some(c => normalize(c) === normalize(text))) return;

  await sanity(`mutate/${DATASET}`, {
    method: 'POST',
    body: JSON.stringify({ mutations: [{ create: { _type: 'question', text, source: 'app', asks: 1 } }] }),
  });
}
