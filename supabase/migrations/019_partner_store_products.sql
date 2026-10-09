-- Products that partners add to the GRRRR store (grrrr-store, page /partenaires), from the link of their invitation.
-- A product is pending until the admin publishes it from the email the store-products Edge Function sends;
-- the store then lists it under "Chez nos partenaires". Nothing is sold by the store: a product leads to the
-- partner's own page or address.
-- Safe to run again.

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null check (price_cents between 50 and 1000000),
  -- accessories | toys | food | care | services | other
  category text not null default 'other',
  image_url text,
  product_url text,
  -- pending | published | rejected
  status text not null default 'pending',
  -- Secret of the publish / reject link emailed to the admin
  review_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_products_partner_idx on public.store_products(partner_id);
create index if not exists store_products_published_idx on public.store_products(created_at desc) where status = 'published';

-- No policies: the store only talks to the store-products Edge Function (service role), which decides what a
-- visitor, a partner or the admin may see. The review token never leaves it.
alter table public.store_products enable row level security;

-- Product pictures: public, so the store shows them with a plain https URL. Only the Edge Function writes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-products', 'store-products', true, 4 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

notify pgrst, 'reload schema';

-- Result shown in the SQL Editor
select (select count(*) from public.store_products) as products, (select count(*) from storage.buckets where id = 'store-products') as bucket;
