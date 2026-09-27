-- Full identity sheet + official documents for GRRR Care.
-- The pets table is shared with the GRRRR app: only nullable columns are added, nothing existing changes.

alter table public.pets add column if not exists distinguishing_marks text;
alter table public.pets add column if not exists tattoo text;
alter table public.pets add column if not exists registration_number text;
alter table public.pets add column if not exists owner_name text;
alter table public.pets add column if not exists owner_phone text;
alter table public.pets add column if not exists owner_email text;
alter table public.pets add column if not exists owner_address text;

-- One row per document; a pet can hold any number of each type.
create table if not exists public.pet_documents (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  doc_type text not null default 'other'
    check (doc_type in ('passport', 'microchip_certificate', 'adoption', 'ownership', 'registration', 'import_export', 'other')),
  title text,
  document_number text,
  issued_on date,
  expires_on date,
  issuer text,
  notes text,
  file_path text,
  file_mime text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pet_documents_pet_id_idx on public.pet_documents(pet_id);

alter table public.pet_documents enable row level security;

drop policy if exists "Owners manage their pet documents" on public.pet_documents;
create policy "Owners manage their pet documents" on public.pet_documents
  for all to authenticated
  using (owner_id = auth.uid() and pet_id in (select id from public.pets where owner_id = auth.uid()))
  with check (owner_id = auth.uid() and pet_id in (select id from public.pets where owner_id = auth.uid()));

-- Private bucket: official papers are only reachable through short-lived signed URLs.
insert into storage.buckets (id, name, public)
values ('pet-documents', 'pet-documents', false)
on conflict (id) do nothing;

-- Files live under <owner uid>/..., so each user only touches their own folder.
drop policy if exists "Users read their own pet documents" on storage.objects;
create policy "Users read their own pet documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'pet-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users upload their own pet documents" on storage.objects;
create policy "Users upload their own pet documents" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'pet-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users update their own pet documents" on storage.objects;
create policy "Users update their own pet documents" on storage.objects
  for update to authenticated
  using (bucket_id = 'pet-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete their own pet documents" on storage.objects;
create policy "Users delete their own pet documents" on storage.objects
  for delete to authenticated
  using (bucket_id = 'pet-documents' and (storage.foldername(name))[1] = auth.uid()::text);
