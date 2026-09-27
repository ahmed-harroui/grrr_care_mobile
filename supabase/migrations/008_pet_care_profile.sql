-- Care-specific pet fields + photo storage for GRRR Care.
-- The pets table is shared with the GRRRR app: only nullable columns are added, nothing existing changes.

alter table public.pets add column if not exists weight numeric(5,2);
alter table public.pets add column if not exists birthday date;
alter table public.pets add column if not exists color text;
alter table public.pets add column if not exists microchip text;
alter table public.pets add column if not exists sterilized boolean;
alter table public.pets add column if not exists allergies text;
alter table public.pets add column if not exists care_notes text;

-- Public bucket so photo_url is a plain https URL that both apps can display on any device.
insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true)
on conflict (id) do nothing;

-- Files live under <owner uid>/..., so each user can only write their own folder.
drop policy if exists "Pet photos are publicly readable" on storage.objects;
create policy "Pet photos are publicly readable" on storage.objects
  for select using (bucket_id = 'pet-photos');

drop policy if exists "Users upload their own pet photos" on storage.objects;
create policy "Users upload their own pet photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'pet-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users update their own pet photos" on storage.objects;
create policy "Users update their own pet photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'pet-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete their own pet photos" on storage.objects;
create policy "Users delete their own pet photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'pet-photos' and (storage.foldername(name))[1] = auth.uid()::text);
