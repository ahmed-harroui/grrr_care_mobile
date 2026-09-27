// Regenerates supabase/migrations/013_health_profiles.sql from src/lib/health-score/default-profiles.json.
// Run: node scripts/build-health-profiles-sql.mjs
import fs from 'node:fs'

const profiles = JSON.parse(fs.readFileSync('src/lib/health-score/default-profiles.json', 'utf8'))
const literal = (value) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`
const text = (value) => `'${String(value).replaceAll("'", "''")}'`

const rows = profiles.map((p) =>
  `  (${text(p.id)}, ${text(p.species)}, ${text(p.age_group)}, ${literal(p.label)}, ${p.min_age_months}, ${p.max_age_months ?? 'null'}, ${p.min_coverage ?? 0.5}, 'provisional', ${literal(p.categories)})`)

const sql = `-- Health follow-up score: species / age-group profiles, read by the scoring engine (src/lib/health-score).
-- The engine never branches on species — adding a species or age group means adding a row here.
-- Profiles stay "provisional" until a veterinarian validates them (validated_by / validated_at).
-- Generated from src/lib/health-score/default-profiles.json by scripts/build-health-profiles-sql.mjs.
-- Safe to re-run: existing rows are never overwritten.

create table if not exists public.health_profiles (
  id             text primary key,
  species        text not null,
  age_group      text not null,
  label          jsonb not null,
  min_age_months integer not null default 0,
  max_age_months integer,
  min_coverage   numeric not null default 0.5,
  status         text not null default 'provisional' check (status in ('provisional', 'validated')),
  validated_by   text,
  validated_at   date,
  categories     jsonb not null,
  sanity_id      text unique,
  updated_at     timestamptz not null default now(),
  unique (species, age_group),
  check (max_age_months is null or max_age_months > min_age_months)
);

alter table public.health_profiles enable row level security;

-- Everyone can read the rules; only the service role (Studio sync) writes them.
drop policy if exists "Health profiles are public" on public.health_profiles;
create policy "Health profiles are public" on public.health_profiles for select using (true);

insert into public.health_profiles (id, species, age_group, label, min_age_months, max_age_months, min_coverage, status, categories) values
${rows.join(',\n')}
on conflict (id) do nothing;
`
fs.writeFileSync('supabase/migrations/013_health_profiles.sql', sql)
console.log(`wrote ${profiles.length} profiles to supabase/migrations/013_health_profiles.sql`)
