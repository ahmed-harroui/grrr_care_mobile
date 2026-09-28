// Turns a reference file uploaded to the private knowledge-files bucket (PDF, photo, text) into knowledge_documents
// entries that grrr-chat uses as numbered sources for every owner.
// Called by the storage trigger of migration 014 with { path }. It trusts nothing else from the request: it only
// reads files already in the bucket, which owners can't write to, and only those the trigger marked pending.
// Secrets: ANTHROPIC_API_KEY (required), KNOWLEDGE_MODEL (optional).
// Deploy with --no-verify-jwt: the database trigger calls it without a user token.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const MODEL = Deno.env.get('KNOWLEDGE_MODEL') ?? 'claude-opus-5';
const BUCKET = 'knowledge-files';
const MAX_TEXT_BYTES = 400_000;
const IMAGE_TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const SYSTEM = `You turn a reference document about animal care into knowledge entries for GRRR, the pet-care assistant of the GRRR Care app. GRRR answers owners' questions from these entries and cites them, so they must hold every useful fact of the document.

• Split the document into self-contained entries, one per topic (a disease, a vaccination schedule, a feeding guideline, a behaviour problem...). Each entry must make sense on its own, in 80 to 400 words, plain text, using "•" for lists.
• Keep every concrete fact: figures, ages, schedules, quantities and doses as written, symptoms, warnings, what to do and when to see a vet.
• Leave out what doesn't help an owner: legal notices, references, ads, tables of contents.
• Write in the document's language.
• species: the animals the entry is about, lowercase English singular (dog, cat, rabbit, bird, horse...), or an empty list when it applies to pets in general.
• category: one lowercase word such as nutrition, prevention, medication, behavior, emergency, grooming, reproduction or general.
• If the document is unreadable or not about animal care, return no entries.`;

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          category: { type: 'string' },
          species: { type: 'array', items: { type: 'string' } },
          content: { type: 'string' },
        },
        required: ['title', 'category', 'species', 'content'],
        additionalProperties: false,
      },
    },
  },
  required: ['entries'],
  additionalProperties: false,
};

function fileBlock(path: string, mime: string | undefined, bytes: Uint8Array) {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const m = (mime || '').toLowerCase();
  if (m === 'application/pdf' || ext === 'pdf') {
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: encodeBase64(bytes) } };
  }
  const image = Object.values(IMAGE_TYPES).includes(m) ? m : IMAGE_TYPES[ext];
  if (image) return { type: 'image', source: { type: 'base64', media_type: image, data: encodeBase64(bytes) } };
  if (m.startsWith('text/') || ['txt', 'md', 'csv'].includes(ext)) {
    return { type: 'text', text: new TextDecoder().decode(bytes.slice(0, MAX_TEXT_BYTES)) };
  }
  return null;
}

async function extractEntries(apiKey: string, block: unknown, path: string) {
  // Opus-tier models can refuse on a safety classifier; server-side fallbacks retry on another model
  const fallbacks = /^claude-(opus|fable)-5/.test(MODEL);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      ...(fallbacks ? { 'anthropic-beta': 'server-side-fallback-2026-07-01' } : {}),
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16000,
      // One file at a time within the Edge Function time limit: low effort keeps the extraction fast
      output_config: { effort: 'low', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      ...(fallbacks ? { fallbacks: 'default' } : {}),
      system: SYSTEM,
      messages: [{ role: 'user', content: [block, { type: 'text', text: `File name: ${path}` }] }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const u = data.usage ?? {};
  console.log(`${path} usage input=${u.input_tokens} output=${u.output_tokens}`);
  // A cut-off or refused answer doesn't match the schema
  if (data.stop_reason !== 'end_turn') throw new Error(`stopped: ${data.stop_reason}`);
  const text = (data.content ?? []).find((b: any) => b.type === 'text')?.text;
  return JSON.parse(text).entries as { title: string; category: string; species: string[]; content: string }[];
}

async function ingest(admin: ReturnType<typeof createClient>, apiKey: string, path: string) {
  const finish = (status: string, fields: { entries?: number; error?: string } = {}) =>
    admin.from('knowledge_files').update({ status, ...fields, updated_at: new Date().toISOString() }).eq('path', path);

  try {
    const { data: file, error: downloadError } = await admin.storage.from(BUCKET).download(path);
    if (downloadError || !file) throw downloadError ?? new Error('download failed');
    const block = fileBlock(path, file.type, new Uint8Array(await file.arrayBuffer()));
    if (!block) {
      // Word, Excel, HEIC... the model can't read them
      await finish('unsupported');
      return;
    }

    const entries = (await extractEntries(apiKey, block, path)).filter(e => e.title.trim() && e.content.trim());
    // A first folder named after a species (dog/guide.pdf) overrides what the model chose; "all" means every pet
    const folder = path.includes('/') ? path.split('/')[0].toLowerCase() : null;
    const rows = entries.map(e => ({
      id: `kb-${crypto.randomUUID()}`,
      title: e.title.trim().slice(0, 200),
      category: e.category.trim().toLowerCase() || 'general',
      species: folder === 'all' ? [] : folder ? [folder] : e.species.map(s => s.trim().toLowerCase()).filter(Boolean),
      content: e.content.trim(),
      is_published: true,
      source_file: path,
    }));

    // Replaces what an earlier version of the same file produced
    const { error: deleteError } = await admin.from('knowledge_documents').delete().eq('source_file', path);
    if (deleteError) throw deleteError;
    if (rows.length) {
      const { error: insertError } = await admin.from('knowledge_documents').insert(rows);
      if (insertError) throw insertError;
    }
    await finish(rows.length ? 'done' : 'failed', rows.length ? { entries: rows.length } : { error: 'no usable content' });
  } catch (e) {
    console.error('ingest error', path, e);
    await finish('failed', { error: String((e as Error)?.message ?? e).slice(0, 500) });
  }
}

Deno.serve(async req => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY is not configured' }, 500);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  if (typeof body?.path !== 'string') return json({ error: 'Invalid request' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  // Claims the file, so a repeated call can't read it twice
  const { data: claimed } = await admin
    .from('knowledge_files')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('path', body.path)
    .eq('status', 'pending')
    .select('path');
  if (!claimed?.length) return json({ skipped: true });

  // The trigger doesn't wait: the file is read after the response is sent
  EdgeRuntime.waitUntil(ingest(admin, apiKey, body.path));
  return json({ accepted: true });
});
