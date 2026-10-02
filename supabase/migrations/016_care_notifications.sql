-- GRRR Care notifications. Safe to run again.
-- The Care app shares this database (and its pets) with the GRRRR app. Phones of both apps
-- register in public.push_tokens (GRRRR migration 011); the new `app` column tells them apart, so
-- a Care phone never receives GRRRR's likes and a GRRRR phone never receives Care's reminders.
-- Care's own notifications go in public.care_notifications, posted to the same send-push Edge
-- Function by the same webhook trigger as GRRRR's (GRRRR migration 019).
-- Reminders come on their own, from the pet's health record (pg_cron, every hour):
--   vaccines due in 7 days, tomorrow, or overdue (once a week); a vet visit tomorrow and a few
--   hours before; the treatments in progress each morning, and the day before they end;
--   the birthday; a weekly health tip.

-- 1. Which app a phone belongs to.
alter table public.push_tokens add column if not exists app text not null default 'grrrr';
alter table public.push_tokens drop constraint if exists push_tokens_app_check;
alter table public.push_tokens add constraint push_tokens_app_check check (app in ('grrrr', 'care'));

-- The 4-argument version is replaced (a default argument would make the old call ambiguous).
drop function if exists public.register_push_token(text, text, text, jsonb);
create or replace function public.register_push_token(p_token text, p_platform text, p_language text, p_prefs jsonb, p_app text default 'grrrr')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or coalesce(p_token, '') = '' then return; end if;
  insert into public.push_tokens (token, user_id, platform, language, prefs, app)
  values (p_token, auth.uid(), p_platform, coalesce(p_language, 'fr'), coalesce(p_prefs, '{}'::jsonb), case when p_app = 'care' then 'care' else 'grrrr' end)
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, language = excluded.language, prefs = excluded.prefs, app = excluded.app, updated_at = now();
end;
$$;
revoke execute on function public.register_push_token(text, text, text, jsonb, text) from public, anon;
grant execute on function public.register_push_token(text, text, text, jsonb, text) to authenticated;

-- 2. Care notifications: one row per reminder, texts in both languages in data.
create table if not exists public.care_notifications (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  type text not null,
  reminder_key text,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists care_notifications_key_idx on public.care_notifications (pet_id, reminder_key);
create index if not exists care_notifications_pet_created_idx on public.care_notifications (pet_id, created_at desc);

alter table public.care_notifications enable row level security;
drop policy if exists "Owners can read their pet care notifications" on public.care_notifications;
create policy "Owners can read their pet care notifications" on public.care_notifications
  for select using (exists (select 1 from public.pets where pets.id = care_notifications.pet_id and pets.owner_id = auth.uid()));
drop policy if exists "Owners can update their pet care notifications" on public.care_notifications;
create policy "Owners can update their pet care notifications" on public.care_notifications
  for update using (exists (select 1 from public.pets where pets.id = care_notifications.pet_id and pets.owner_id = auth.uid()));
drop policy if exists "Owners can delete their pet care notifications" on public.care_notifications;
create policy "Owners can delete their pet care notifications" on public.care_notifications
  for delete using (exists (select 1 from public.pets where pets.id = care_notifications.pet_id and pets.owner_id = auth.uid()));

-- To the phones, through send-push (the trigger function comes from GRRRR migration 019).
drop trigger if exists care_notifications_send_push on public.care_notifications;
create trigger care_notifications_send_push
after insert on public.care_notifications
for each row execute function public.trg_send_push();

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'care_notifications') then
    alter publication supabase_realtime add table public.care_notifications;
  end if;
end $$;

-- Internal: one reminder, once (the key makes it unique for the pet).
create or replace function public.care_remind(p_pet_id uuid, p_type text, p_key text, p_data jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.care_notifications (pet_id, type, reminder_key, data)
  values (p_pet_id, p_type, p_key, p_data)
  on conflict (pet_id, reminder_key) do nothing;
  return found;
end;
$$;

-- 3. The reminders, every hour. Only for accounts with the Care app on a phone.
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
begin
  -- Vaccines: in 7 days, tomorrow (from 9:00), and overdue (once a week).
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
    if not morning then continue; end if;
    if days between 6 and 7 then
      if public.care_remind(r.pet_id, 'vaccine', 'vaccine7:' || r.id, jsonb_build_object('icon', '💉', 'channel', 'vaccines', 'screen', 'health',
        'titleFr', 'Vaccin de ' || r.pet_name || ' dans une semaine', 'titleEn', r.pet_name || '''s vaccine in a week',
        'bodyFr', r.vaccine || ' : pense à prendre rendez-vous chez le vétérinaire.', 'bodyEn', r.vaccine || ': remember to book the vet.')) then sent := sent + 1; end if;
    elsif days = 1 then
      if public.care_remind(r.pet_id, 'vaccine', 'vaccine1:' || r.id, jsonb_build_object('icon', '💉', 'channel', 'vaccines', 'screen', 'health',
        'titleFr', 'Vaccin de ' || r.pet_name || ' demain', 'titleEn', r.pet_name || '''s vaccine tomorrow',
        'bodyFr', r.vaccine || ' est prévu demain.', 'bodyEn', r.vaccine || ' is due tomorrow.')) then sent := sent + 1; end if;
    elsif days < 0 then
      if public.care_remind(r.pet_id, 'vaccine', 'vaccineLate:' || r.id || ':' || to_char(paris, 'IYYY-IW'), jsonb_build_object('icon', '⚠️', 'channel', 'vaccines', 'screen', 'health',
        'titleFr', 'Vaccin en retard pour ' || r.pet_name, 'titleEn', r.pet_name || '''s vaccine is overdue',
        'bodyFr', r.vaccine || ' était prévu il y a ' || abs(days) || ' jour' || case when abs(days) > 1 then 's' else '' end || '. Ajoute la nouvelle dose une fois faite.',
        'bodyEn', r.vaccine || ' was due ' || abs(days) || ' day' || case when abs(days) > 1 then 's' else '' end || ' ago. Add the new dose once done.')) then sent := sent + 1; end if;
    end if;
  end loop;

  -- Vet visits: the day before (from 9:00), and 1 to 3 hours before.
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

  -- Treatments in progress: each morning, and the day before the last one.
  for r in
    select m.id, m.name, m.dosage, m.frequency, m.end_date, p.id as pet_id, p.pet_name
    from public.medications m join public.pets p on p.id = m.pet_id
    where m.start_date <= now() and (m.end_date is null or m.end_date >= now() - interval '1 day') and not coalesce(p.is_bot, false)
      and exists (select 1 from public.push_tokens t where t.user_id = p.owner_id and t.app = 'care')
  loop
    if care_ends_tomorrow(r.end_date, today) then
      if public.care_remind(r.pet_id, 'medication', 'medEnd:' || r.id, jsonb_build_object('icon', '💊', 'channel', 'medications', 'screen', 'health',
        'titleFr', 'Fin du traitement demain', 'titleEn', 'Treatment ends tomorrow',
        'bodyFr', r.name || ' pour ' || r.pet_name || ' : dernière prise demain.', 'bodyEn', r.name || ' for ' || r.pet_name || ': last dose tomorrow.')) then sent := sent + 1; end if;
    end if;
    if r.end_date is null or (r.end_date at time zone 'Europe/Paris')::date >= today then
      if public.care_remind(r.pet_id, 'medication', 'med:' || r.id || ':' || today, jsonb_build_object('icon', '💊', 'channel', 'medications', 'screen', 'health',
        'titleFr', 'Traitement de ' || r.pet_name, 'titleEn', r.pet_name || '''s treatment',
        'bodyFr', r.name || coalesce(' · ' || nullif(r.dosage, ''), '') || coalesce(' · ' || nullif(r.frequency, ''), ''),
        'bodyEn', r.name || coalesce(' · ' || nullif(r.dosage, ''), '') || coalesce(' · ' || nullif(r.frequency, ''), ''))) then sent := sent + 1; end if;
    end if;
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
        jsonb_build_object('icon', '🪱', 'channel', 'health', 'screen', 'health', 'titleFr', 'Vermifuge et antiparasitaire', 'titleEn', 'Deworming and flea care', 'bodyFr', 'Note les traitements de ' || r.pet_name || ' dans Care pour être prévenu à temps.', 'bodyEn', 'Log ' || r.pet_name || '''s treatments in Care to be reminded on time.'),
        jsonb_build_object('icon', '💧', 'channel', 'health', 'screen', 'chat', 'titleFr', 'Bien hydraté ?', 'titleEn', 'Well hydrated?', 'bodyFr', 'De l''eau fraîche à volonté : le geste santé le plus simple pour ' || r.pet_name || '.', 'bodyEn', 'Fresh water at all times: the simplest health habit for ' || r.pet_name || '.')
      ])[1 + (extract(week from today)::integer % 4)]) then sent := sent + 1; end if;
    end if;
  end loop;
  return sent;
end;
$$;

-- Helpers kept tiny and readable.
create or replace function public.care_hours_until(p_at timestamptz) returns numeric language sql stable as $$
  select extract(epoch from (p_at - now())) / 3600
$$;
create or replace function public.care_ends_tomorrow(p_end timestamptz, p_today date) returns boolean language sql stable as $$
  select p_end is not null and (p_end at time zone 'Europe/Paris')::date = p_today + 1
$$;

revoke execute on function public.care_remind(uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.send_care_reminders() from public, anon, authenticated;

select cron.schedule('grrr-care-reminders', '5 * * * *', 'select public.send_care_reminders()');

notify pgrst, 'reload schema';
