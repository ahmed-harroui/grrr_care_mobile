-- Before publishing the app:
-- 1. Private details move out of public.pets. Every signed-in GRRRR user can read every pet (discovery),
--    so the owner's contact details, the tattoo and registration numbers, the distinguishing marks and the
--    care notes now live in public.pet_private, readable by the pet's owner only. The shared health fields
--    (weight, birthday, color, microchip, sterilized, allergies) stay on pets: the GRRRR app uses them.
-- 2. public.ai_reports: an owner can report an answer of the assistant (Google Play rule for generative AI).
--    Reports are read in the Supabase dashboard, never by the apps.
-- Safe to run again.

create table if not exists public.pet_private (
  pet_id uuid primary key references public.pets(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  owner_name text,
  owner_phone text,
  owner_email text,
  owner_address text,
  tattoo text,
  registration_number text,
  distinguishing_marks text,
  care_notes text,
  updated_at timestamptz not null default now()
);

alter table public.pet_private enable row level security;

drop policy if exists "Owners manage their pet's private details" on public.pet_private;
create policy "Owners manage their pet's private details" on public.pet_private
  for all to authenticated
  using (owner_id = auth.uid() and pet_id in (select id from public.pets where owner_id = auth.uid()))
  with check (owner_id = auth.uid() and pet_id in (select id from public.pets where owner_id = auth.uid()));

-- Move what was already filled in, then remove the columns from the shared table.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pets' and column_name = 'owner_phone') then
    insert into public.pet_private (pet_id, owner_id, owner_name, owner_phone, owner_email, owner_address, tattoo, registration_number, distinguishing_marks, care_notes)
    select id, owner_id, owner_name, owner_phone, owner_email, owner_address, tattoo, registration_number, distinguishing_marks, care_notes
    from public.pets
    where coalesce(owner_name, owner_phone, owner_email, owner_address, tattoo, registration_number, distinguishing_marks, care_notes) is not null
    on conflict (pet_id) do nothing;
  end if;
end $$;

alter table public.pets
  drop column if exists owner_name,
  drop column if exists owner_phone,
  drop column if exists owner_email,
  drop column if exists owner_address,
  drop column if exists tattoo,
  drop column if exists registration_number,
  drop column if exists distinguishing_marks,
  drop column if exists care_notes;

create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  mode text,
  question text,
  answer text not null check (length(answer) <= 4000),
  created_at timestamptz not null default now()
);

alter table public.ai_reports enable row level security;

drop policy if exists "Users report answers" on public.ai_reports;
create policy "Users report answers" on public.ai_reports
  for insert to authenticated
  with check (user_id = auth.uid());

notify pgrst, 'reload schema';

-- Result shown in the SQL Editor
select
  (select count(*) from public.pet_private) as private_rows,
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'pets' and column_name in ('owner_phone', 'care_notes')) as private_columns_left_on_pets;
