-- The GRRRR store is paid in croquettes: the treats pets earn in the apps (pets.treats), which an account can
-- also buy with money (store-checkout Edge Function, Stripe). 1 croquette is worth 0,50 €.
--   * An account's balance is the treats of all its pets. An order takes them from the pets that hold the most.
--   * XP used to follow the balance. It now follows pets.treats_earned, the treats a pet earned by itself:
--     spending croquettes no longer lowers a pet's level, and buying croquettes does not buy XP.
--   * Every write goes through the functions below, run by the Edge Function with the service role.
-- The pets table and its XP belong to the GRRRR app (its migrations 005, 013, 018, 023); this file sits with
-- the other store migrations. Safe to run again.

-- 1. Treats earned, apart from the balance ------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pets' and column_name = 'treats_earned') then
    alter table public.pets add column treats_earned integer not null default 0;
    -- Until today every treat was earned
    update public.pets set treats_earned = treats where treats > 0;
  end if;
end $$;

-- A balance that goes up was earned, unless the store says it was bought (store_credit_croquettes)
create or replace function public.trg_pet_treats_earned()
returns trigger
language plpgsql
as $$
begin
  if new.treats > old.treats and coalesce(current_setting('grrrr.store_credit', true), '') <> 'on' then
    new.treats_earned := old.treats_earned + (new.treats - old.treats);
  end if;
  return new;
end;
$$;

drop trigger if exists pets_treats_earned on public.pets;
create trigger pets_treats_earned
before update of treats on public.pets
for each row execute function public.trg_pet_treats_earned();

-- XP reads the treats earned instead of the balance (the function is the GRRRR app's: only this changes)
do $$
declare
  def text;
begin
  select pg_get_functiondef('public.compute_pet_progress(uuid)'::regprocedure) into def;
  if def not like '%pet.treats_earned%' then
    execute replace(def, 'coalesce(pet.treats, 0)', 'coalesce(pet.treats_earned, 0)');
  end if;
end $$;

-- 2. What the store sells, and for how much ---------------------------------------------------------------
create table if not exists public.store_items (
  slug text primary key,
  name text not null,
  croquettes integer not null check (croquettes > 0),
  is_active boolean not null default true
);

alter table public.store_items enable row level security;
drop policy if exists "Anyone reads the store's prices" on public.store_items;
create policy "Anyone reads the store's prices" on public.store_items for select using (true);

-- Former euro prices at 0,50 € the croquette, rounded up
insert into public.store_items (slug, name, croquettes) values
  ('colliers', 'Colliers', 50),
  ('medailles', 'Médailles', 40),
  ('jouets', 'Jouets', 34),
  ('friandises', 'Friandises', 26),
  ('gourde', 'Gourde nomade', 36)
on conflict (slug) do nothing;

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- [{ slug, name, variant, quantity, croquettes }]
  items jsonb not null,
  total integer not null check (total > 0),
  -- { name, address, postcode, city, phone }
  shipping jsonb not null,
  -- paid | shipped | cancelled
  status text not null default 'paid',
  created_at timestamptz not null default now()
);

create index if not exists store_orders_user_idx on public.store_orders(user_id, created_at desc);
alter table public.store_orders enable row level security;
drop policy if exists "Users read their orders" on public.store_orders;
create policy "Users read their orders" on public.store_orders for select using (auth.uid() = user_id);

create table if not exists public.croquette_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  croquettes integer not null check (croquettes > 0),
  amount_cents integer not null,
  -- The payment provider's id of the payment: a payment is credited once
  provider_ref text not null unique,
  created_at timestamptz not null default now()
);

alter table public.croquette_purchases enable row level security;
drop policy if exists "Users read their purchases" on public.croquette_purchases;
create policy "Users read their purchases" on public.croquette_purchases for select using (auth.uid() = user_id);

-- 3. Balance, order, credit -------------------------------------------------------------------------------
create or replace function public.store_balance(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(treats), 0)::integer from public.pets where owner_id = p_user;
$$;

-- For the signed-in account, from the store's header
create or replace function public.my_croquettes()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select public.store_balance(auth.uid());
$$;

-- Prices come from store_items, never from the browser. Raises NOT_ENOUGH when the balance is short.
create or replace function public.store_place_order(p_user uuid, p_items jsonb, p_shipping jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_price public.store_items;
  v_quantity integer;
  v_lines jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_left integer;
  v_take integer;
  v_pet record;
  v_order uuid;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    raise exception 'INVALID_ORDER';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_price from public.store_items where slug = v_item ->> 'slug' and is_active;
    v_quantity := coalesce((v_item ->> 'quantity')::integer, 0);
    if v_price.slug is null or v_quantity < 1 or v_quantity > 10 then raise exception 'INVALID_ORDER'; end if;
    v_total := v_total + v_price.croquettes * v_quantity;
    v_lines := v_lines || jsonb_build_object(
      'slug', v_price.slug, 'name', v_price.name, 'variant', left(coalesce(v_item ->> 'variant', ''), 60),
      'quantity', v_quantity, 'croquettes', v_price.croquettes);
  end loop;

  -- The account's pets are locked until the order is written: two orders can't spend the same croquettes
  perform 1 from public.pets where owner_id = p_user order by id for update;
  if public.store_balance(p_user) < v_total then raise exception 'NOT_ENOUGH'; end if;

  v_left := v_total;
  for v_pet in select id, treats from public.pets where owner_id = p_user and treats > 0 order by treats desc, id loop
    exit when v_left = 0;
    v_take := least(v_pet.treats, v_left);
    update public.pets set treats = treats - v_take, updated_at = now() where id = v_pet.id;
    v_left := v_left - v_take;
  end loop;

  insert into public.store_orders (user_id, items, total, shipping)
  values (p_user, v_lines, v_total, p_shipping)
  returning id into v_order;

  return jsonb_build_object('order', v_order, 'items', v_lines, 'total', v_total, 'balance', public.store_balance(p_user));
end;
$$;

-- Croquettes bought with money, once per payment. They go to the account's main pet, as daily gifts do.
create or replace function public.store_credit_croquettes(p_user uuid, p_croquettes integer, p_amount_cents integer, p_provider_ref text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pet uuid;
begin
  if p_croquettes < 1 then raise exception 'INVALID_AMOUNT'; end if;
  insert into public.croquette_purchases (user_id, croquettes, amount_cents, provider_ref)
  values (p_user, p_croquettes, p_amount_cents, p_provider_ref)
  on conflict (provider_ref) do nothing;
  if not found then
    return jsonb_build_object('credited', false, 'balance', public.store_balance(p_user));
  end if;

  select id into v_pet from public.pets where owner_id = p_user order by setup_pending, xp desc nulls last, created_at limit 1;
  if v_pet is null then raise exception 'NO_PET'; end if;
  -- Bought, not earned: the trigger leaves treats_earned (and so the XP) alone
  perform set_config('grrrr.store_credit', 'on', true);
  update public.pets set treats = treats + p_croquettes, updated_at = now() where id = v_pet;
  perform set_config('grrrr.store_credit', '', true);

  return jsonb_build_object('credited', true, 'balance', public.store_balance(p_user));
end;
$$;

revoke execute on function public.store_balance(uuid) from public, anon, authenticated;
revoke execute on function public.store_place_order(uuid, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.store_credit_croquettes(uuid, integer, integer, text) from public, anon, authenticated;
revoke execute on function public.my_croquettes() from public, anon;
grant execute on function public.my_croquettes() to authenticated;
grant execute on function public.store_balance(uuid), public.store_place_order(uuid, jsonb, jsonb), public.store_credit_croquettes(uuid, integer, integer, text) to service_role;

notify pgrst, 'reload schema';

-- Result shown in the SQL Editor
select
  (select count(*) from public.store_items) as items,
  (select coalesce(sum(treats), 0) from public.pets) as croquettes_in_circulation,
  (select count(*) from public.pets where treats_earned <> treats) as pets_with_a_different_earned_total;
