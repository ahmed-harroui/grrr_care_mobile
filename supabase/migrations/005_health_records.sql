-- Create Health Records tables for vaccines, medications, and vet visits

create table if not exists public.vaccinations (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  vaccine text not null,
  date timestamptz not null,
  next_due timestamptz,
  vet_name text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  name text not null,
  dosage text,
  frequency text,
  start_date timestamptz not null,
  end_date timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.vet_visits (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  date timestamptz not null,
  vet_name text,
  reason text,
  diagnosis text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for faster queries
create index if not exists vaccinations_pet_id_idx on public.vaccinations(pet_id);
create index if not exists vaccinations_date_idx on public.vaccinations(date desc);

create index if not exists medications_pet_id_idx on public.medications(pet_id);
create index if not exists medications_start_date_idx on public.medications(start_date desc);

create index if not exists vet_visits_pet_id_idx on public.vet_visits(pet_id);
create index if not exists vet_visits_date_idx on public.vet_visits(date desc);

-- Enable RLS
alter table public.vaccinations enable row level security;
alter table public.medications enable row level security;
alter table public.vet_visits enable row level security;

-- Public read policies (data is linked to pet owner)
create policy "Users can read their pet's vaccinations" on public.vaccinations
  for select using (
    pet_id in (select id from public.pets where owner_id = auth.uid())
  );

create policy "Users can read their pet's medications" on public.medications
  for select using (
    pet_id in (select id from public.pets where owner_id = auth.uid())
  );

create policy "Users can read their pet's vet visits" on public.vet_visits
  for select using (
    pet_id in (select id from public.pets where owner_id = auth.uid())
  );

-- Write policies
create policy "Users can create vaccination records" on public.vaccinations
  for insert with check (
    pet_id in (select id from public.pets where owner_id = auth.uid())
  );

create policy "Users can create medication records" on public.medications
  for insert with check (
    pet_id in (select id from public.pets where owner_id = auth.uid())
  );

create policy "Users can create vet visit records" on public.vet_visits
  for insert with check (
    pet_id in (select id from public.pets where owner_id = auth.uid())
  );

-- Delete policies
create policy if not exists "Users can delete vaccination records" on public.vaccinations
  for delete using (
    pet_id in (select id from public.pets where owner_id = auth.uid())
  );

create policy if not exists "Users can delete medication records" on public.medications
  for delete using (
    pet_id in (select id from public.pets where owner_id = auth.uid())
  );

create policy if not exists "Users can delete vet visit records" on public.vet_visits
  for delete using (
    pet_id in (select id from public.pets where owner_id = auth.uid())
  );
