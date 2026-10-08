-- The map gets real establishments, imported from OpenStreetMap (scripts/import-osm-places.mjs), and each one
-- can be invited by email to become a partner (scripts/partner-invites.mjs, public/partenaire.html).
--   * A place imported from OpenStreetMap is a plain listing: is_partner = false, no rating.
--   * A partner is an establishment that said yes: it applied through the form, or it accepted its invitation.
--     It may offer a discount to GRRR members (discount_percent).
-- Safe to run again.

alter table public.partners add column if not exists source text not null default 'manual'; -- manual | form | osm
alter table public.partners add column if not exists osm_id text;                           -- e.g. node/123456
alter table public.partners add column if not exists city text;
alter table public.partners add column if not exists postcode text;
alter table public.partners add column if not exists is_partner boolean not null default false;
alter table public.partners add column if not exists partner_since timestamptz;
alter table public.partners add column if not exists discount_percent integer;
-- An imported place has no rating of ours: the 4.5 default would be made up
alter table public.partners alter column rating drop default;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'partners_discount_range') then
    alter table public.partners add constraint partners_discount_range check (discount_percent between 1 and 50);
  end if;
end $$;

create unique index if not exists partners_osm_id_key on public.partners(osm_id);
create index if not exists partners_position_idx on public.partners(latitude, longitude) where is_published;
create index if not exists partners_is_partner_idx on public.partners(is_partner) where is_partner;

-- The demo establishments of migration 007 ("123 Main St, Downtown") must not reach real owners.
delete from public.partners
where source = 'manual' and created_at::date = date '2026-09-26'
  and email in ('info@riverside.vet', 'contact@westside.vet', 'hello@petcare.plus', 'er@emergencyvet.com',
                'orders@petmeds.shop', 'info@pawsclaws.store', 'book@pamperedpaws.groom');

-- Establishments that came through the form applied themselves: they are partners.
update public.partners p
set source = 'form', is_partner = true, partner_since = coalesce(p.partner_since, a.confirmed_at)
from public.partner_applications a
where a.partner_id = p.id and p.source = 'manual';

-- A test application is not an establishment
update public.partners set is_published = false where name = 'profiles' and source = 'form';

-- One invitation per establishment. The token is the secret of its email link, so it lives apart from partners
-- (which every app user can read) in a table only the Edge Function (service role) reads.
create table if not exists public.partner_invites (
  partner_id uuid primary key references public.partners(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  email text not null,
  -- pending | sent | accepted | declined
  status text not null default 'pending',
  sent_at timestamptz,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.partner_invites enable row level security;

-- Places around a point, nearest first: the app and the assistant never load the whole country.
create or replace function public.partners_near(p_latitude double precision, p_longitude double precision, p_km double precision default 30, p_limit integer default 200)
returns table (
  id uuid, name text, category text, description text, address text, city text, phone text, email text, website text,
  latitude numeric, longitude numeric, rating numeric, is_featured boolean, is_partner boolean, discount_percent integer,
  distance_km double precision
)
language sql
stable
set search_path = public
as $$
  select p.id, p.name, p.category, p.description, p.address, p.city, p.phone, p.email, p.website,
         p.latitude, p.longitude, p.rating, p.is_featured, p.is_partner, p.discount_percent, d.km
  from public.partners p
  cross join lateral (
    select 6371 * 2 * asin(sqrt(
      power(sin(radians(p.latitude::double precision - p_latitude) / 2), 2)
      + cos(radians(p_latitude)) * cos(radians(p.latitude::double precision))
        * power(sin(radians(p.longitude::double precision - p_longitude) / 2), 2)
    )) as km
  ) d
  where p.is_published
    and p.latitude between p_latitude - p_km / 111.0 and p_latitude + p_km / 111.0
    and p.longitude between p_longitude - p_km / (111.0 * greatest(cos(radians(p_latitude)), 0.1))
                        and p_longitude + p_km / (111.0 * greatest(cos(radians(p_latitude)), 0.1))
    and d.km <= p_km
  order by d.km
  limit least(greatest(p_limit, 1), 500);
$$;

grant execute on function public.partners_near(double precision, double precision, double precision, integer) to anon, authenticated;

notify pgrst, 'reload schema';

-- Result shown in the SQL Editor
select source, count(*) as places, count(*) filter (where is_partner) as partners, count(*) filter (where is_published) as published
from public.partners group by source;
