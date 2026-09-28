-- Establishments that ask to appear on the Find Vet map, through the public form (docs/partner-form.html, served by GitHub Pages).
-- Flow, run by the partner-application Edge Function:
--   1. the form is sent: a row is added here (unconfirmed) and a confirmation link is emailed
--   2. the link is opened: the establishment is copied into partners with is_published = false
--   3. the admin checks it and sets partners.is_published = true: it shows on the map

create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text,
  address text not null,
  phone text not null,
  email text not null,
  website text,
  -- From the address (OpenStreetMap); null when it couldn't be found, to be filled in by hand
  latitude numeric,
  longitude numeric,
  token uuid not null unique default gen_random_uuid(),
  -- unconfirmed | confirmed
  status text not null default 'unconfirmed',
  partner_id uuid references public.partners(id) on delete set null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists partner_applications_email_idx on public.partner_applications(lower(email), created_at);

-- No policies: only the Edge Function (service role) reads or writes this table
alter table public.partner_applications enable row level security;
