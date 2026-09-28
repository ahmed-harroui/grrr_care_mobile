-- Makes the content of uploaded files a data source for the assistant.
--  1. Pet documents: grrr-doc-read now keeps the full content of each file (ai_content) next to the
--     short summary shown to the owner (ai_summary); grrr-chat answers from ai_content.
--  2. Reference files for every owner: files uploaded to the private knowledge-files bucket are turned
--     into knowledge_documents entries by the grrr-kb-ingest Edge Function, called by the trigger below.
--     A first folder named after a species (dog/guide.pdf) limits the entries to that species.

-- 1. Pet documents
alter table public.pet_documents add column if not exists ai_content text;
-- Files read before ai_content existed are read again once, so the chat gets their full content
update public.pet_documents set ai_summary_path = null where ai_summary_status = 'done' and ai_content is null;

-- 2. Reference files
insert into storage.buckets (id, name, public, file_size_limit)
values ('knowledge-files', 'knowledge-files', false, 32 * 1024 * 1024)
on conflict (id) do nothing;

-- Storage path of the file an entry was made from; null for the hand-written entries
alter table public.knowledge_documents add column if not exists source_file text;
create index if not exists knowledge_documents_source_file_idx on public.knowledge_documents(source_file);

-- One row per uploaded file, so its processing can be followed from the dashboard
create table if not exists public.knowledge_files (
  path text primary key,
  -- pending | processing | done | failed | unsupported
  status text not null default 'pending',
  entries integer,
  error text,
  updated_at timestamptz not null default now()
);
-- No policies: only the Edge Function (service role) and the triggers below use it
alter table public.knowledge_files enable row level security;

create extension if not exists pg_net;

create or replace function public.queue_knowledge_file()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.knowledge_files (path, status, entries, error, updated_at)
  values (new.name, 'pending', null, null, now())
  on conflict (path) do update set status = 'pending', entries = null, error = null, updated_at = now();

  perform net.http_post(
    url := 'https://mfamxvbepohyeigpnsyi.supabase.co/functions/v1/grrr-kb-ingest',
    body := jsonb_build_object('path', new.name),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
end;
$$;

create or replace function public.forget_knowledge_file()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.knowledge_documents where source_file = old.name;
  delete from public.knowledge_files where path = old.name;
  return old;
end;
$$;

-- Fires once the upload is complete (the eTag is set then), and again when the file is replaced.
-- Downloads and other metadata updates keep the same eTag, so they don't re-read the file.
drop trigger if exists knowledge_file_uploaded on storage.objects;
create trigger knowledge_file_uploaded
after insert on storage.objects
for each row
when (new.bucket_id = 'knowledge-files' and new.metadata ->> 'eTag' is not null)
execute function public.queue_knowledge_file();

drop trigger if exists knowledge_file_replaced on storage.objects;
create trigger knowledge_file_replaced
after update on storage.objects
for each row
when (
  new.bucket_id = 'knowledge-files'
  and new.metadata ->> 'eTag' is not null
  and new.metadata ->> 'eTag' is distinct from old.metadata ->> 'eTag'
)
execute function public.queue_knowledge_file();

drop trigger if exists knowledge_file_deleted on storage.objects;
create trigger knowledge_file_deleted
after delete on storage.objects
for each row
when (old.bucket_id = 'knowledge-files')
execute function public.forget_knowledge_file();
