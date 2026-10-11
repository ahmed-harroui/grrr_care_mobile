-- Care plan, the weekly game, and calmer reminders. Safe to run again.
--   1. care_plan: what is coming for a pet that is not yet in its record (the next vaccine dose,
--      deworming, flea and tick care, the yearly check-up). Written by the app: by hand, or by the
--      "magic wand" that works the dates out from the pet's species and age.
--   2. Medications know how often they are given (every_days), so a monthly treatment is not
--      announced every morning.
--   3. Reminders without spam: the treatments of a pet in ONE morning message, a late item once a
--      month instead of once a week, and never more than 2 messages a day for a pet (a vet
--      appointment always goes through).
--   4. The game "help your pets": a finished game is recorded, and day 7 of the weekly gifts
--      (the week's big gift) is only given once the game has been finished that week.

-- 1. The care plan.
create table if not exists public.care_plan (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  kind text not null check (kind in ('vaccine', 'deworming', 'parasite', 'checkup', 'other')),
  title text not null,
  title_en text,
  due_date date not null,
  -- Comes back by itself this many days after it is done (null: once)
  repeat_days integer,
  done_at timestamptz,
  source text not null default 'manual' check (source in ('manual', 'wand')),
  -- Makes a generated item unique for the pet, so the wand can run again without doubles
  plan_key text,
  created_at timestamptz not null default now()
);
create unique index if not exists care_plan_key_idx on public.care_plan (pet_id, plan_key);
create index if not exists care_plan_due_idx on public.care_plan (pet_id, due_date) where done_at is null;

alter table public.care_plan enable row level security;
drop policy if exists "Owners manage their pet care plan" on public.care_plan;
create policy "Owners manage their pet care plan" on public.care_plan
  for all
  using (exists (select 1 from public.pets where pets.id = care_plan.pet_id and pets.owner_id = auth.uid()))
  with check (exists (select 1 from public.pets where pets.id = care_plan.pet_id and pets.owner_id = auth.uid()));

-- 2. How often a treatment is given: 1 every day, 7 every week, 30 every month.
alter table public.medications add column if not exists every_days integer not null default 1;
alter table public.medications drop constraint if exists medications_every_days_check;
alter table public.medications add constraint medications_every_days_check check (every_days between 1 and 366);

-- 3. One reminder, once (the key makes it unique for the pet), and at most 2 a day for a pet.
create or replace function public.care_remind(p_pet_id uuid, p_type text, p_key text, p_data jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  day_start timestamptz := date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
begin
  if p_type <> 'visit' and (select count(*) from public.care_notifications where pet_id = p_pet_id and type <> 'visit' and created_at >= day_start) >= 2 then
    return false;
  end if;
  insert into public.care_notifications (pet_id, type, reminder_key, data)
  values (p_pet_id, p_type, p_key, p_data)
  on conflict (pet_id, reminder_key) do nothing;
  return found;
end;
$$;

create or replace function public.send_care_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  sent integer := 0;
  paris timestamp := now() at time zone 'Europe/Paris';
  today date := (now() at time zone 'Europe/Paris')::date;
  morning boolean := extract(hour from (now() at time zone 'Europe/Paris')) >= 9;
  r record;
  days integer;
  late text;
  late_en text;
begin
  -- Vet visits first, they are never held back: the day before (from 9:00), and 1 to 3 hours before.
  for r in
    select vv.id, vv.date, vv.vet_name, vv.reason, p.id as pet_id, p.pet_name
    from public.vet_visits vv join public.pets p on p.id = vv.pet_id
    where vv.date > now() and vv.date < now() + interval '2 days' and not coalesce(p.is_bot, false)
      and exists (select 1 from public.push_tokens t where t.user_id = p.owner_id and t.app = 'care')
  loop
    if care_hours_until(r.date) between 1 and 3 then
      if public.care_remind(r.pet_id, 'visit', 'visitSoon:' || r.id, jsonb_build_object('icon', '🩺', 'channel', 'appointments', 'screen', 'health',
        'titleFr', 'Vétérinaire à ' || to_char(r.date at time zone 'Europe/Paris', 'HH24:MI'), 'titleEn', 'Vet at ' || to_char(r.date at time zone 'Europe/Paris', 'HH24:MI'),
        'bodyFr', r.pet_name || coalesce(' chez ' || nullif(r.vet_name, ''), '') || coalesce(' · ' || nullif(r.reason, ''), '') || '. Pense au carnet de santé.',
        'bodyEn', r.pet_name || coalesce(' at ' || nullif(r.vet_name, ''), '') || coalesce(' · ' || nullif(r.reason, ''), '') || '. Bring the health record.')) then sent := sent + 1; end if;
    elsif morning and (r.date at time zone 'Europe/Paris')::date = today + 1 then
      if public.care_remind(r.pet_id, 'visit', 'visit1:' || r.id, jsonb_build_object('icon', '🩺', 'channel', 'appointments', 'screen', 'health',
        'titleFr', 'Vétérinaire demain pour ' || r.pet_name, 'titleEn', 'Vet tomorrow for ' || r.pet_name,
        'bodyFr', 'À ' || to_char(r.date at time zone 'Europe/Paris', 'HH24:MI') || coalesce(' chez ' || nullif(r.vet_name, ''), '') || coalesce(' · ' || nullif(r.reason, ''), '') || '.',
        'bodyEn', 'At ' || to_char(r.date at time zone 'Europe/Paris', 'HH24:MI') || coalesce(' at ' || nullif(r.vet_name, ''), '') || coalesce(' · ' || nullif(r.reason, ''), '') || '.')) then sent := sent + 1; end if;
    end if;
  end loop;

  if not morning then return sent; end if;

  -- Vaccines: in 7 days, tomorrow, and overdue (once a month).
  for r in
    select v.id, v.vaccine, v.next_due, p.id as pet_id, p.pet_name
    from public.vaccinations v join public.pets p on p.id = v.pet_id
    where v.next_due is not null and not coalesce(p.is_bot, false)
      and exists (select 1 from public.push_tokens t where t.user_id = p.owner_id and t.app = 'care')
      and v.next_due < now() + interval '8 days'
      -- A later dose of the same vaccine replaces this one.
      and not exists (select 1 from public.vaccinations later where later.pet_id = v.pet_id and lower(later.vaccine) = lower(v.vaccine) and later.date > v.date)
  loop
    days := ((r.next_due at time zone 'Europe/Paris')::date - today);
    if days between 6 and 7 then
      if public.care_remind(r.pet_id, 'vaccine', 'vaccine7:' || r.id, jsonb_build_object('icon', '💉', 'channel', 'vaccines', 'screen', 'health',
        'titleFr', 'Vaccin de ' || r.pet_name || ' dans une semaine', 'titleEn', r.pet_name || '''s vaccine in a week',
        'bodyFr', r.vaccine || ' : pense à prendre rendez-vous chez le vétérinaire.', 'bodyEn', r.vaccine || ': remember to book the vet.')) then sent := sent + 1; end if;
    elsif days = 1 then
      if public.care_remind(r.pet_id, 'vaccine', 'vaccine1:' || r.id, jsonb_build_object('icon', '💉', 'channel', 'vaccines', 'screen', 'health',
        'titleFr', 'Vaccin de ' || r.pet_name || ' demain', 'titleEn', r.pet_name || '''s vaccine tomorrow',
        'bodyFr', r.vaccine || ' est prévu demain.', 'bodyEn', r.vaccine || ' is due tomorrow.')) then sent := sent + 1; end if;
    elsif days < 0 then
      if public.care_remind(r.pet_id, 'vaccine', 'vaccineLate:' || r.id || ':' || to_char(paris, 'YYYY-MM'), jsonb_build_object('icon', '⚠️', 'channel', 'vaccines', 'screen', 'health',
        'titleFr', 'Vaccin en retard pour ' || r.pet_name, 'titleEn', r.pet_name || '''s vaccine is overdue',
        'bodyFr', r.vaccine || ' était prévu il y a ' || abs(days) || ' jour' || case when abs(days) > 1 then 's' else '' end || '. Ajoute la nouvelle dose une fois faite.',
        'bodyEn', r.vaccine || ' was due ' || abs(days) || ' day' || case when abs(days) > 1 then 's' else '' end || ' ago. Add the new dose once done.')) then sent := sent + 1; end if;
    end if;
  end loop;

  -- The care plan: a week before (not for what comes back every month), the day before, and late
  -- (3 days after, then once a month).
  for r in
    select c.id, c.kind, c.title, coalesce(c.title_en, c.title) as title_en, c.due_date, c.repeat_days, p.id as pet_id, p.pet_name
    from public.care_plan c join public.pets p on p.id = c.pet_id
    where c.done_at is null and c.due_date <= today + 7 and not coalesce(p.is_bot, false)
      and exists (select 1 from public.push_tokens t where t.user_id = p.owner_id and t.app = 'care')
  loop
    days := r.due_date - today;
    if days between 6 and 7 and coalesce(r.repeat_days, 365) > 31 then
      if public.care_remind(r.pet_id, 'plan', 'plan7:' || r.id, jsonb_build_object('icon', public.care_plan_icon(r.kind), 'channel', public.care_plan_channel(r.kind), 'screen', 'health',
        'titleFr', r.pet_name || ' : ' || r.title, 'titleEn', r.pet_name || ': ' || r.title_en,
        'bodyFr', 'C''est dans une semaine, le ' || to_char(r.due_date, 'DD/MM') || '. Pense à prendre rendez-vous si besoin.',
        'bodyEn', 'It is in a week, on ' || to_char(r.due_date, 'DD/MM') || '. Book the vet if needed.')) then sent := sent + 1; end if;
    elsif days = 1 then
      if public.care_remind(r.pet_id, 'plan', 'plan1:' || r.id, jsonb_build_object('icon', public.care_plan_icon(r.kind), 'channel', public.care_plan_channel(r.kind), 'screen', 'health',
        'titleFr', r.pet_name || ' : ' || r.title, 'titleEn', r.pet_name || ': ' || r.title_en,
        'bodyFr', 'C''est prévu demain. Coche-le dans Care une fois fait.', 'bodyEn', 'It is due tomorrow. Tick it in Care once done.')) then sent := sent + 1; end if;
    elsif days <= -3 then
      late := 'Prévu il y a ' || abs(days) || ' jours. Coche-le dans Care une fois fait, ou change sa date.';
      late_en := 'Due ' || abs(days) || ' days ago. Tick it in Care once done, or change its date.';
      if public.care_remind(r.pet_id, 'plan', 'planLate:' || r.id || ':' || to_char(paris, 'YYYY-MM'), jsonb_build_object('icon', '⚠️', 'channel', public.care_plan_channel(r.kind), 'screen', 'health',
        'titleFr', r.pet_name || ' : ' || r.title, 'titleEn', r.pet_name || ': ' || r.title_en, 'bodyFr', late, 'bodyEn', late_en)) then sent := sent + 1; end if;
    end if;
  end loop;

  -- Treatments: the day before the last dose of one, and the ones to give today in ONE message.
  for r in
    select m.id, m.name, p.id as pet_id, p.pet_name
    from public.medications m join public.pets p on p.id = m.pet_id
    where m.start_date <= now() and care_ends_tomorrow(m.end_date, today) and not coalesce(p.is_bot, false)
      and exists (select 1 from public.push_tokens t where t.user_id = p.owner_id and t.app = 'care')
  loop
    if public.care_remind(r.pet_id, 'medication', 'medEnd:' || r.id, jsonb_build_object('icon', '💊', 'channel', 'medications', 'screen', 'health',
      'titleFr', 'Fin du traitement demain', 'titleEn', 'Treatment ends tomorrow',
      'bodyFr', r.name || ' pour ' || r.pet_name || ' : dernière prise demain.', 'bodyEn', r.name || ' for ' || r.pet_name || ': last dose tomorrow.')) then sent := sent + 1; end if;
  end loop;
  for r in
    select p.id as pet_id, p.pet_name, count(*) as n,
      string_agg(m.name || coalesce(' · ' || nullif(m.dosage, ''), '') || coalesce(' · ' || nullif(m.frequency, ''), ''), E'\n' order by m.start_date) as list
    from public.medications m join public.pets p on p.id = m.pet_id
    where (m.start_date at time zone 'Europe/Paris')::date <= today
      and (m.end_date is null or (m.end_date at time zone 'Europe/Paris')::date >= today)
      -- Only on the days it is given: every day, every week, every month…
      and (today - (m.start_date at time zone 'Europe/Paris')::date) % m.every_days = 0
      and not coalesce(p.is_bot, false)
      and exists (select 1 from public.push_tokens t where t.user_id = p.owner_id and t.app = 'care')
    group by p.id, p.pet_name
  loop
    if public.care_remind(r.pet_id, 'medication', 'meds:' || today, jsonb_build_object('icon', '💊', 'channel', 'medications', 'screen', 'health',
      'titleFr', case when r.n > 1 then 'Les ' || r.n || ' traitements de ' || r.pet_name || ' aujourd''hui' else 'Traitement de ' || r.pet_name || ' aujourd''hui' end,
      'titleEn', case when r.n > 1 then r.pet_name || '''s ' || r.n || ' treatments today' else r.pet_name || '''s treatment today' end,
      'bodyFr', r.list, 'bodyEn', r.list)) then sent := sent + 1; end if;
  end loop;

  -- Birthdays and the weekly tip (Sunday), once per pet.
  for r in
    select p.id as pet_id, p.pet_name, p.birthday, lower(p.species) as species
    from public.pets p
    where not coalesce(p.is_bot, false) and not coalesce(p.adopter_only, false)
      and exists (select 1 from public.push_tokens t where t.user_id = p.owner_id and t.app = 'care')
  loop
    if r.birthday is not null and to_char(r.birthday, 'MM-DD') = to_char(today, 'MM-DD') then
      if public.care_remind(r.pet_id, 'birthday', 'birthday:' || to_char(today, 'YYYY'), jsonb_build_object('icon', '🎂', 'channel', 'health', 'screen', 'pet',
        'titleFr', 'Joyeux anniversaire ' || r.pet_name || ' !', 'titleEn', 'Happy birthday ' || r.pet_name || '!',
        'bodyFr', 'Un bon moment de plus ensemble : pense aussi à le peser pour son suivi.', 'bodyEn', 'One more good moment together: also weigh them for their record.')) then sent := sent + 1; end if;
    end if;
    if extract(isodow from today) = 7 then
      if public.care_remind(r.pet_id, 'tip', 'tip:' || to_char(today, 'IYYY-IW'), (array[
        jsonb_build_object('icon', '⚖️', 'channel', 'health', 'screen', 'health', 'titleFr', 'Le poids de ' || r.pet_name, 'titleEn', r.pet_name || '''s weight', 'bodyFr', 'Une pesée par mois aide à repérer tôt les soucis de santé.', 'bodyEn', 'Weighing once a month helps spot health issues early.'),
        jsonb_build_object('icon', '🦷', 'channel', 'health', 'screen', 'chat', 'titleFr', 'Les dents de ' || r.pet_name, 'titleEn', r.pet_name || '''s teeth', 'bodyFr', 'Mauvaise haleine ou gencives rouges ? Demande à l''assistant GRRR Care.', 'bodyEn', 'Bad breath or red gums? Ask the GRRR Care assistant.'),
        jsonb_build_object('icon', '🪄', 'channel', 'health', 'screen', 'health', 'titleFr', 'Les prochains soins de ' || r.pet_name, 'titleEn', r.pet_name || '''s next care dates', 'bodyFr', 'La baguette magique de l''onglet Santé calcule les prochaines dates selon son âge.', 'bodyEn', 'The magic wand of the Health tab works out the next dates from their age.'),
        jsonb_build_object('icon', '💧', 'channel', 'health', 'screen', 'chat', 'titleFr', 'Bien hydraté ?', 'titleEn', 'Well hydrated?', 'bodyFr', 'De l''eau fraîche à volonté : le geste santé le plus simple pour ' || r.pet_name || '.', 'bodyEn', 'Fresh water at all times: the simplest health habit for ' || r.pet_name || '.')
      ])[1 + (extract(week from today)::integer % 4)]) then sent := sent + 1; end if;
    end if;
  end loop;
  return sent;
end;
$$;

create or replace function public.care_plan_icon(p_kind text) returns text language sql immutable as $$
  select case p_kind when 'vaccine' then '💉' when 'deworming' then '🪱' when 'parasite' then '🛡️' when 'checkup' then '🩺' else '📌' end
$$;
create or replace function public.care_plan_channel(p_kind text) returns text language sql immutable as $$
  select case p_kind when 'vaccine' then 'vaccines' when 'checkup' then 'appointments' else 'health' end
$$;

revoke execute on function public.care_remind(uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.send_care_reminders() from public, anon, authenticated;

-- 4. The game. A finished game, kept per account.
create table if not exists public.care_game_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  solved integer not null default 0,
  missed integer not null default 0,
  kibble integer not null default 0,
  health integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists care_game_runs_user_idx on public.care_game_runs (user_id, created_at desc);
alter table public.care_game_runs enable row level security;
drop policy if exists "Players read their games" on public.care_game_runs;
create policy "Players read their games" on public.care_game_runs for select using (auth.uid() = user_id);

-- Called by the app when a game ends. A game counts when at least one pet was helped.
create or replace function public.record_care_game(p_solved integer, p_missed integer, p_kibble integer, p_health integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Not allowed'; end if;
  if coalesce(p_solved, 0) < 1 then return jsonb_build_object('counted', false); end if;
  -- A game lasts 90 seconds: two in the same minute is a double call.
  if not exists (select 1 from public.care_game_runs where user_id = me and created_at > now() - interval '60 seconds') then
    insert into public.care_game_runs (user_id, solved, missed, kibble, health)
    values (me, least(p_solved, 99), least(greatest(coalesce(p_missed, 0), 0), 99), least(greatest(coalesce(p_kibble, 0), 0), 9999), least(greatest(coalesce(p_health, 0), 0), 100));
  end if;
  return jsonb_build_object('counted', true);
end;
$$;
revoke execute on function public.record_care_game(integer, integer, integer, integer) from public, anon;
grant execute on function public.record_care_game(integer, integer, integer, integer) to authenticated;

-- The game finished during the 7 days of the chain in progress.
create or replace function public.care_game_played(p_user uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.care_game_runs
    where user_id = p_user and created_at >= (((now() at time zone 'Europe/Paris')::date - 6)::timestamp at time zone 'Europe/Paris')
  )
$$;
revoke execute on function public.care_game_played(uuid) from public, anon, authenticated;

-- Where the streak stands (GRRRR migration 023), with the week's game.
create or replace function public.get_daily_streak()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Europe/Paris')::date;
  s public.daily_streaks;
  claimed_today boolean;
  next_day integer;
  v_until timestamptz;
begin
  if auth.uid() is null then return null; end if;
  select * into s from public.daily_streaks where user_id = auth.uid();
  claimed_today := s.last_claim = today;
  next_day := case
    when s.last_claim is null then 1
    when s.last_claim = today then s.day
    when s.last_claim = today - 1 then case when s.day >= 7 then 1 else s.day + 1 end
    else 1
  end;
  select care_ai_until into v_until from public.profiles where user_id = auth.uid();
  return jsonb_build_object(
    'day', next_day,
    'claimedToday', coalesce(claimed_today, false),
    -- Days already collected in the current week (shown as done in the chain).
    'done', case when claimed_today then s.day when s.last_claim = today - 1 and s.day < 7 then s.day else 0 end,
    'best', coalesce(s.best, 0),
    'careAiUntil', v_until,
    'lastReward', (select reward from public.reward_claims where user_id = auth.uid() order by claimed_on desc limit 1),
    -- The AI month is given once: after that, day 7 is a chest of treats.
    'aiMonthUsed', exists (select 1 from public.reward_claims where user_id = auth.uid() and reward ->> 'kind' = 'care_ai'),
    -- Day 7 is only given once the game has been finished this week.
    'gamePlayed', public.care_game_played(auth.uid())
  );
end;
$$;

-- Collects today's gift. Errors the app explains: ALREADY_CLAIMED, GAME_REQUIRED.
create or replace function public.claim_daily_reward(p_app text default 'grrrr', p_pet_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  today date := (now() at time zone 'Europe/Paris')::date;
  s public.daily_streaks;
  v_day integer;
  v_reward jsonb;
  v_pet uuid;
  v_until timestamptz;
begin
  if me is null then raise exception 'Not allowed'; end if;
  insert into public.daily_streaks (user_id) values (me) on conflict do nothing;
  select * into s from public.daily_streaks where user_id = me for update;
  if s.last_claim = today then raise exception 'ALREADY_CLAIMED'; end if;
  v_day := case when s.last_claim = today - 1 and s.day < 7 then s.day + 1 else 1 end;
  -- The week's big gift: the game "help your pets" must have been finished this week.
  if v_day = 7 and not public.care_game_played(me) then raise exception 'GAME_REQUIRED'; end if;
  v_reward := public.daily_reward_for(v_day);
  -- The AI month is given once per account: the next weeks end with a chest of treats.
  if v_reward ->> 'kind' = 'care_ai' and exists (select 1 from public.reward_claims where user_id = me and reward ->> 'kind' = 'care_ai') then
    v_reward := jsonb_build_object('kind', 'treats', 'amount', 12);
  end if;

  if v_reward ->> 'kind' = 'treats' then
    select id into v_pet from public.pets
    where owner_id = me and not coalesce(adopter_only, false)
    order by (id = p_pet_id) desc, xp desc nulls last
    limit 1;
    if v_pet is not null then
      insert into public.treat_events (pet_id, reason, context_key, amount)
      values (v_pet, 'daily', 'daily:' || today, (v_reward ->> 'amount')::integer)
      on conflict (pet_id, context_key) do nothing;
      if found then
        update public.pets set treats = treats + (v_reward ->> 'amount')::integer, updated_at = now() where id = v_pet;
      end if;
      v_reward := v_reward || jsonb_build_object('petId', v_pet, 'petName', (select pet_name from public.pets where id = v_pet));
    end if;
  elsif v_reward ->> 'kind' = 'voucher' then
    v_reward := v_reward || jsonb_build_object('code', 'GRRRR-' || upper(substr(md5(gen_random_uuid()::text), 1, 6)));
  else
    insert into public.profiles (user_id) values (me) on conflict (user_id) do nothing;
    update public.profiles
    set care_ai_until = greatest(now(), coalesce(care_ai_until, now())) + make_interval(days => (v_reward ->> 'days')::integer)
    where user_id = me
    returning care_ai_until into v_until;
    v_reward := v_reward || jsonb_build_object('until', v_until);
  end if;

  update public.daily_streaks
  set day = v_day, last_claim = today, best = greatest(best, v_day), updated_at = now()
  where user_id = me;
  insert into public.reward_claims (user_id, claimed_on, day, app, reward)
  values (me, today, v_day, case when p_app = 'care' then 'care' else 'grrrr' end, v_reward);
  return v_reward || jsonb_build_object('day', v_day);
end;
$$;

revoke execute on function public.get_daily_streak() from public, anon;
revoke execute on function public.claim_daily_reward(text, uuid) from public, anon;
grant execute on function public.get_daily_streak() to authenticated;
grant execute on function public.claim_daily_reward(text, uuid) to authenticated;

notify pgrst, 'reload schema';
