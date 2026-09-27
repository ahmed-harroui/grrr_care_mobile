// Reads the files attached to a pet's official documents (PDF, photo, scan) once and stores a short summary.
// grrr-chat then uses the summary, so files are never re-sent to the model.
// Secrets: ANTHROPIC_API_KEY (required), CHAT_MODEL, CHAT_DAILY_LIMIT (shared with grrr-chat: each file read counts as one message).
// Deploy with --no-verify-jwt: the user is verified below.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';

const MODEL = Deno.env.get('CHAT_MODEL') ?? 'claude-haiku-4-5-20251001';
const DAILY_LIMIT = Number(Deno.env.get('CHAT_DAILY_LIMIT') ?? 30);
const MAX_PER_CALL = 3;
const MAX_TEXT_BYTES = 100_000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const DOC_LABELS: Record<string, string> = {
  passport: 'Pet passport',
  microchip_certificate: 'Microchip / ID certificate',
  adoption: 'Adoption certificate',
  ownership: 'Ownership document',
  registration: 'Registration document',
  import_export: 'Import / export document',
  other: 'Other certificate',
};

const systemPrompt = (lang: string) => `You read an official pet document for GRRR, the pet-care assistant of the GRRR Care app. Your notes are all GRRR will know about this file, and the owner sees them too, so keep every fact that could matter for the pet's care.

Write in ${lang === 'en' ? 'English' : 'French'}, plain text, one fact per line starting with "• ", at most 120 words:
• what the document is and who issued it
• vaccinations with dates and validity (rabies especially), antiparasitic treatments, health checks, conditions, diagnoses or allergies noted
• issue and expiry dates, and travel or entry requirements it covers
• identification present (write "microchip recorded", never the number)

Never copy identifier numbers, owner names, addresses, phone numbers, emails or signatures. If the file is unreadable or is not about a pet, reply exactly UNREADABLE.`;

type Kind = 'image' | 'pdf' | 'text' | null;

function kindOf(mime: string | null, name: string | null): Kind {
  const m = (mime || '').toLowerCase();
  const ext = (name || '').split('.').pop()?.toLowerCase();
  if (IMAGE_TYPES.includes(m)) return 'image';
  if (m === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (m.startsWith('text/') || ext === 'txt') return 'text';
  return null;
}

function fileBlock(kind: Exclude<Kind, null>, mime: string, bytes: Uint8Array) {
  if (kind === 'image') return { type: 'image', source: { type: 'base64', media_type: mime, data: encodeBase64(bytes) } };
  if (kind === 'pdf') return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: encodeBase64(bytes) } };
  return { type: 'text', text: new TextDecoder().decode(bytes.slice(0, MAX_TEXT_BYTES)) };
}

async function summarize(apiKey: string, block: unknown, doc: Record<string, any>, lang: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      system: systemPrompt(lang),
      messages: [
        {
          role: 'user',
          content: [
            block,
            { type: 'text', text: `Type chosen by the owner: ${DOC_LABELS[doc.doc_type] ?? doc.doc_type}${doc.title ? `. Title: ${doc.title}` : ''}` },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const u = data.usage ?? {};
  console.log(`doc ${doc.id} usage input=${u.input_tokens} output=${u.output_tokens}`);
  return (data.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
    .trim();
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
  if (typeof body?.petId !== 'string') return json({ error: 'Invalid request' }, 400);

  const { data: pet } = await admin.from('pets').select('id, owner_id').eq('id', body.petId).maybeSingle();
  if (!pet || pet.owner_id !== user.id) return json({ error: 'Pet not found' }, 404);

  const { data: rows, error } = await admin
    .from('pet_documents')
    .select('id, doc_type, title, file_path, file_mime, file_name, ai_summary_path')
    .eq('pet_id', pet.id)
    .not('file_path', 'is', null)
    .order('created_at');
  if (error) return json({ error: error.message }, 500);

  const allPending = (rows ?? []).filter(d => d.ai_summary_path !== d.file_path);
  const pending = allPending.slice(0, MAX_PER_CALL);
  const results: { id: string; status: string }[] = [];

  for (const doc of pending) {
    const save = (status: string, summary: string | null = null) =>
      admin
        .from('pet_documents')
        .update({ ai_summary: summary, ai_summary_status: status, ai_summary_path: doc.file_path })
        .eq('id', doc.id);

    const kind = kindOf(doc.file_mime, doc.file_name);
    if (!kind) {
      // Word, Excel, HEIC... the model can't read them: marked so they aren't retried
      await save('unsupported');
      results.push({ id: doc.id, status: 'unsupported' });
      continue;
    }

    const { data: used, error: usageError } = await admin.rpc('increment_chat_usage', { p_user: user.id });
    if (usageError || used > DAILY_LIMIT) {
      // Left pending: it will be read on a later day
      results.push({ id: doc.id, status: 'daily_limit' });
      break;
    }

    try {
      const { data: file, error: downloadError } = await admin.storage.from('pet-documents').download(doc.file_path);
      if (downloadError || !file) throw downloadError ?? new Error('download failed');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const summary = await summarize(apiKey, fileBlock(kind, doc.file_mime || 'image/jpeg', bytes), doc, body.language);
      const readable = summary && !/^UNREADABLE\b/i.test(summary);
      await save(readable ? 'done' : 'failed', readable ? summary.slice(0, 1500) : null);
      results.push({ id: doc.id, status: readable ? 'done' : 'failed' });
    } catch (e) {
      console.error('doc read error', doc.id, e);
      await save('failed');
      results.push({ id: doc.id, status: 'failed' });
    }
  }

  const finished = results.filter(r => r.status !== 'daily_limit').length;
  return json({ results, remaining: allPending.length - finished });
});
