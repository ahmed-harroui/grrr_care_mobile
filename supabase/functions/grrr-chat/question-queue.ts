// Feeds the website's Sanity question queue (strategie-ecosysteme-gr) with what owners ask in the app;
// the site's weekly content engine turns the oldest unused question into a guide.
// Secrets: SANITY_PROJECT_ID + SANITY_WRITE_TOKEN (Editor token) enable it; SANITY_DATASET is optional (default production).

const PROJECT_ID = Deno.env.get('SANITY_PROJECT_ID');
const TOKEN = Deno.env.get('SANITY_WRITE_TOKEN');
const DATASET = Deno.env.get('SANITY_DATASET') || 'production';
const API = `https://${PROJECT_ID}.api.sanity.io/v2026-09-01/data`;

// Same filter as the site: drafts are never part of the queue
const COVERED = `*[_type == "question" && !(_id in path("drafts.**"))].text + *[_type == "guide" && !(_id in path("drafts.**"))].title`;

async function sanity(path: string, init?: RequestInit) {
  const res = await fetch(`${API}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
  });
  if (!res.ok) throw new Error(`sanity ${res.status}: ${await res.text()}`);
  return res.json();
}

function rewritePrompt(covered: string[]) {
  return `Owners ask questions to the assistant of a pet-care app. Turn the owner's message into ONE general question that a public pet-care guide could answer.
- Write it in English, as a short natural question (max 120 characters), for example: "How do I stop my dog pulling on the lead?"
- Remove everything personal: owner or pet names, places, dates, contact details.
- Reply exactly SKIP if the message is not a pet-care question (greeting, thanks, test, off-topic), only makes sense with an earlier conversation, or is already covered by one of these existing topics:
${covered.map(t => `• ${t}`).join('\n') || '(none yet)'}

Reply with the question or SKIP, nothing else.`;
}

const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export const questionQueueEnabled = Boolean(PROJECT_ID && TOKEN);

export async function queueQuestion(message: string, apiKey: string, model: string) {
  const { result: covered = [] } = await sanity(`query/${DATASET}?query=${encodeURIComponent(COVERED)}`);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: 100,
      system: rewritePrompt(covered.filter(Boolean)),
      messages: [{ role: 'user', content: message }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join(' ')
    .trim()
    .replace(/^["“]|["”]$/g, '');
  if (/^SKIP\b/i.test(text) || text.length < 10 || text.length > 200) return;
  if (covered.some((c: string) => c && normalize(c) === normalize(text))) return;

  await sanity(`mutate/${DATASET}`, {
    method: 'POST',
    body: JSON.stringify({ mutations: [{ create: { _type: 'question', text, used: false, source: 'app' } }] }),
  });
}
