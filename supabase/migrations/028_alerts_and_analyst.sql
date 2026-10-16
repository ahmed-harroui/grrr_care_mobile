-- Alerts and the data analyst of the admin dashboard (www.greatrascals.com/dashboard). Safe to run again.
--   1. analytics: views of what the apps store, with no personal data (no email, name, phone,
--      address, position, message text or question asked). The analyst only ever reads these.
--   2. analyst_query(sql): runs one SELECT written by the dashboard's analyst (Claude) as the role
--      grr_analyst, which can read the analytics views and nothing else; whatever the query does is
--      rolled back, it is cut after 8 seconds and returns 500 rows at most.
--   3. admin_alerts(): the problems worth knowing, from the same data (jobs failing, sign-ups
--      stopping, people leaving at the pet setup, answers reported, products to review…).
--   4. Every morning, an email to the admin when there is something (Edge Function admin-alerts).

-- 1. The analytics views -----------------------------------------------------------------------
create schema if not exists analytics;

create or replace view analytics.accounts as
  select u.id, u.created_at, u.last_sign_in_at, coalesce(u.raw_app_meta_data ->> 'provider', 'email') as signed_up_with,
    exists (select 1 from public.push_tokens t where t.user_id = u.id and coalesce(t.app, 'grrrr') = 'grrrr') as has_grrrr_phone,
    exists (select 1 from public.push_tokens t where t.user_id = u.id and t.app = 'care') as has_care_phone
  from auth.users u;
comment on view analytics.accounts is 'One row per account. signed_up_with: email or google.';

create or replace view analytics.pets as
  select id, owner_id, lower(species) as species, breed, gender, age, birthday, xp, level, treats, mode, energy,
    coalesce(is_bot, false) as is_demo_profile, coalesce(adopter_only, false) as adopter_only, coalesce(setup_pending, false) as setup_pending,
    matches_count, outings_count, messages_received, sessions_count, created_at
  from public.pets;
comment on view analytics.pets is 'is_demo_profile: the demo profiles (bots), to leave out of real activity. setup_pending: an account that never filled its pet in. mode >= 50 means Hot, else Friend.';

create or replace view analytics.likes as select from_pet_id, to_pet_id, upper(action) as action, intent, created_at from public.pet_swipes;
create or replace view analytics.matches as select id, pet_one_id, pet_two_id, match_type, status, created_at from public.pet_matches;
create or replace view analytics.messages as select id, match_id, sender_pet_id, length(body) as length, created_at from public.match_messages;
comment on view analytics.messages is 'Chat messages between matched pets: no text, only its length.';
create or replace view analytics.outings as select id, match_id, proposer_pet_id, status, scheduled_at, accepted_at, created_at from public.meeting_proposals;
create or replace view analytics.weekly_visits as select pet_id, week_start, created_at from public.pet_weekly_visits;
create or replace view analytics.map_presence as select pet_id, updated_at from public.pet_locations;
comment on view analytics.map_presence is 'Pets visible on the GRRRR map, with when they were last seen (no position).';
create or replace view analytics.adoption_interests as select pet_id, adopter_pet_id, intent, created_at from public.adoption_interests;
create or replace view analytics.rehoming as select id, lower(species) as species, status, created_at from public.rehoming_listings;

create or replace view analytics.vaccinations as select pet_id, vaccine, date, next_due, created_at from public.vaccinations;
create or replace view analytics.medications as select pet_id, name, start_date, end_date, every_days, created_at from public.medications;
create or replace view analytics.vet_visits as select pet_id, date, reason, created_at from public.vet_visits;
create or replace view analytics.care_plan as select pet_id, kind, due_date, done_at, source, repeat_days, created_at from public.care_plan;
comment on view analytics.care_plan is 'source = wand: dates planned by the magic wand; manual: added by hand.';
create or replace view analytics.documents as select pet_id, doc_type, created_at from public.pet_documents;
create or replace view analytics.assistant_usage as select user_id, day, count as questions from public.chat_usage;
comment on view analytics.assistant_usage is 'Questions asked to the GRRR Care assistant, per account and day (free limit: 30 a day).';
create or replace view analytics.ai_reports as select id, user_id, pet_id, mode, created_at from public.ai_reports;
comment on view analytics.ai_reports is 'Assistant answers reported by people (no text).';
create or replace view analytics.game_runs as select user_id, solved, missed, kibble, health, created_at from public.care_game_runs;
create or replace view analytics.care_reminders as select pet_id, type, created_at, read_at from public.care_notifications;
create or replace view analytics.app_notifications as select pet_id, type, created_at, read_at from public.notifications;

create or replace view analytics.daily_gifts as select user_id, claimed_on, day, app, reward ->> 'kind' as kind, (reward ->> 'amount')::integer as amount, created_at from public.reward_claims;
create or replace view analytics.treats_given as select pet_id, reason, amount, created_at from public.treat_events;
comment on view analytics.treats_given is 'Croquettes given for free: reason = match, daily (gifts) or outing.';
create or replace view analytics.streaks as select user_id, day, best, last_claim from public.daily_streaks;

create or replace view analytics.store_orders as
  select o.id, o.user_id, o.total as croquettes, o.status, o.created_at,
    (select coalesce(jsonb_agg(jsonb_build_object('slug', i ->> 'slug', 'name', i ->> 'name', 'quantity', i -> 'quantity', 'croquettes', i -> 'croquettes')), '[]') from jsonb_array_elements(o.items) i) as items
  from public.store_orders o;
comment on view analytics.store_orders is 'Store orders paid in croquettes (no address, no engraving text).';
create or replace view analytics.croquette_purchases as select user_id, croquettes, amount_cents, created_at from public.croquette_purchases;
create or replace view analytics.store_items as select slug, name, croquettes, is_active from public.store_items;

create or replace view analytics.places as select id, name, category, city, postcode, source, is_partner, is_published, discount_percent, created_at from public.partners;
comment on view analytics.places is 'Vets (clinic), pet shops (supplies) and groomers (grooming) on the maps; is_partner: said yes to GRRR.';
create or replace view analytics.partner_invites as select partner_id, status, sent_at, answered_at, created_at from public.partner_invites;
create or replace view analytics.partner_products as select id, partner_id, category, price_cents, status, created_at from public.store_products;
create or replace view analytics.partner_applications as select id, category, status, created_at, confirmed_at from public.partner_applications;
create or replace view analytics.community_threads as select id, category, animal, is_official, like_count, comment_count, created_at from public.grr_threads;

-- The role the analyst's queries run as: these views, read only, nothing else
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'grr_analyst') then create role grr_analyst nologin; end if;
end $$;
grant grr_analyst to postgres;
grant usage on schema analytics to grr_analyst;
grant select on all tables in schema analytics to grr_analyst;
revoke all on schema analytics from anon, authenticated;

-- 2. One query of the analyst ------------------------------------------------------------------
-- It belongs to grr_analyst (it runs with its rights), so it lives in the analytics schema, where that
-- role may own functions; public.analyst_query is the door the server calls.
grant create on schema analytics to grr_analyst;
create or replace function analytics.run_query(p_sql text)
returns jsonb
language plpgsql
security definer
set search_path = analytics, pg_catalog
as $$
declare
  rows jsonb;
  started timestamptz := clock_timestamp();
begin
  if p_sql is null or p_sql !~* '^\s*(select|with)\s' then
    return jsonb_build_object('error', 'Only one SELECT (or WITH … SELECT) query is allowed.');
  end if;
  -- A statement's time limit can't be changed once it runs: what could stall the database is refused
  if p_sql ~* '(pg_sleep|pg_terminate|pg_cancel|pg_advisory|dblink|lo_|pg_read|pg_ls)' then
    return jsonb_build_object('error', 'This function is not allowed in an analysis query.');
  end if;
  perform set_config('statement_timeout', '8000', true);
  begin
    execute format('select coalesce(jsonb_agg(t), ''[]'') from (select * from (%s) q limit 500) t', regexp_replace(p_sql, ';\s*$', ''))
      into rows;
    -- Whatever the query did is undone: it ends on an error that is caught right here
    raise exception using errcode = 'P0A01', message = rows::text;
  exception
    when sqlstate 'P0A01' then rows := sqlerrm::jsonb;
    when others then return jsonb_build_object('error', sqlerrm);
  end;
  return jsonb_build_object('rows', rows, 'count', jsonb_array_length(rows), 'ms', round(extract(epoch from clock_timestamp() - started) * 1000));
end;
$$;
alter function analytics.run_query(text) owner to grr_analyst;
revoke execute on function analytics.run_query(text) from public, anon, authenticated;
grant execute on function analytics.run_query(text) to postgres;

create or replace function public.analyst_query(p_sql text)
returns jsonb
language sql
security definer
set search_path = public
as $$ select analytics.run_query(p_sql) $$;
revoke execute on function public.analyst_query(text) from public, anon, authenticated;
grant execute on function public.analyst_query(text) to service_role;

-- What the analyst can read: each view, its columns and its note
create or replace function public.analyst_schema()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'view', c.relname,
    'note', obj_description(c.oid),
    'columns', (select string_agg(a.attname || ' ' || format_type(a.atttypid, a.atttypmod), ', ' order by a.attnum)
                from pg_attribute a where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped)
  ) order by c.relname), '[]')
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'analytics' and c.relkind = 'v'
$$;
revoke execute on function public.analyst_schema() from public, anon, authenticated;
grant execute on function public.analyst_schema() to service_role;

-- 3. The alerts ---------------------------------------------------------------------------------
-- level: critical (something is broken), warning (something to look at), info (good to know).
create or replace function public.admin_alerts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, cron
as $$
declare
  alerts jsonb := '[]';
  r record;
  n integer;
  m integer;
  add_alert text;
begin
  -- Scheduled jobs that failed in the last 24 hours
  for r in select j.jobname, count(*) as failures, max(d.return_message) as message
           from cron.job_run_details d join cron.job j on j.jobid = d.jobid
           where d.status = 'failed' and d.start_time > now() - interval '24 hours' group by j.jobname loop
    alerts := alerts || jsonb_build_object('level', 'critical', 'key', 'job:' || r.jobname,
      'title', 'Une tâche planifiée échoue : ' || r.jobname,
      'detail', r.failures || ' échec(s) en 24 h. ' || left(coalesce(r.message, ''), 200));
  end loop;
  -- The hourly reminders stopped running
  for r in select j.jobname, max(d.start_time) as last_run from cron.job j left join cron.job_run_details d on d.jobid = j.jobid and d.status = 'succeeded'
           where j.jobname in ('grrr-care-reminders', 'grrrr-reminders') group by j.jobname loop
    if r.last_run is null or r.last_run < now() - interval '3 hours' then
      alerts := alerts || jsonb_build_object('level', 'critical', 'key', 'stale:' || r.jobname,
        'title', 'Les rappels ne partent plus (' || r.jobname || ')',
        'detail', 'Dernière exécution réussie : ' || coalesce(to_char(r.last_run at time zone 'Europe/Paris', 'DD/MM HH24:MI'), 'jamais') || '. Elle doit tourner toutes les heures.');
    end if;
  end loop;

  -- Sign-ups stopped
  select count(*) into n from auth.users where created_at > now() - interval '7 days';
  select count(*) into m from auth.users where created_at between now() - interval '37 days' and now() - interval '7 days';
  if n = 0 and m > 0 then
    alerts := alerts || jsonb_build_object('level', 'warning', 'key', 'signups', 'title', 'Aucune inscription depuis 7 jours',
      'detail', m || ' inscriptions les 30 jours d''avant. Vérifie que la création de compte marche toujours.');
  end if;

  -- Fewer people coming back
  select count(*) into n from auth.users where last_sign_in_at > now() - interval '7 days';
  select count(*) into m from auth.users where last_sign_in_at between now() - interval '14 days' and now() - interval '7 days';
  if m >= 4 and n < m / 2.0 then
    alerts := alerts || jsonb_build_object('level', 'warning', 'key', 'active', 'title', 'Moitié moins de personnes actives',
      'detail', n || ' connectés cette semaine contre ' || m || ' la semaine d''avant.');
  end if;

  -- People leaving at the pet setup
  select count(*), count(*) filter (where not exists (select 1 from public.pets p where p.owner_id = u.id and not coalesce(p.setup_pending, false) and not coalesce(p.is_bot, false)))
    into n, m from auth.users u where u.created_at > now() - interval '14 days' and u.created_at < now() - interval '1 day';
  if m >= 3 and m >= n / 2.0 then
    alerts := alerts || jsonb_build_object('level', 'warning', 'key', 'onboarding', 'title', 'Beaucoup de comptes sans compagnon',
      'detail', m || ' des ' || n || ' comptes créés ces 14 jours n''ont pas rempli leur compagnon. La création du profil bloque peut-être.');
  end if;

  -- Assistant answers reported
  select count(*) into n from public.ai_reports where created_at > now() - interval '7 days';
  if n > 0 then
    alerts := alerts || jsonb_build_object('level', 'warning', 'key', 'ai_reports', 'title', n || ' réponse(s) de l''assistant signalée(s) cette semaine',
      'detail', 'À relire dans la table ai_reports (question et réponse signalées).');
  end if;

  -- People hitting the assistant's daily limit
  select count(distinct user_id) into n from public.chat_usage where day > current_date - 7 and count >= 30;
  if n > 0 then
    alerts := alerts || jsonb_build_object('level', 'info', 'key', 'ai_limit', 'title', n || ' personne(s) ont atteint la limite de l''assistant',
      'detail', '30 questions dans la journée cette semaine : des clients possibles pour Care+.');
  end if;

  -- Partner products waiting for a review
  select count(*), coalesce(extract(day from now() - min(created_at))::integer, 0) into n, m from public.store_products where status = 'pending';
  if n > 0 then
    alerts := alerts || jsonb_build_object('level', case when m >= 2 then 'warning' else 'info' end, 'key', 'products', 'title', n || ' produit(s) de partenaire à valider',
      'detail', 'Le plus ancien attend depuis ' || m || ' jour(s). Le lien de validation est dans l''email reçu pour chacun.');
  end if;

  -- Store orders not handled
  select count(*), coalesce(extract(day from now() - min(created_at))::integer, 0) into n, m from public.store_orders where coalesce(status, 'new') in ('new', 'paid', 'pending');
  if n > 0 and m >= 2 then
    alerts := alerts || jsonb_build_object('level', 'warning', 'key', 'orders', 'title', n || ' commande(s) de la boutique à expédier',
      'detail', 'La plus ancienne attend depuis ' || m || ' jour(s).');
  end if;

  -- Partner applications never confirmed by email
  select count(*) into n from public.partner_applications where status = 'unconfirmed' and created_at < now() - interval '3 days' and created_at > now() - interval '30 days';
  if n > 0 then
    alerts := alerts || jsonb_build_object('level', 'info', 'key', 'applications', 'title', n || ' candidature(s) de partenaire jamais confirmée(s)',
      'detail', 'Ils ont rempli le formulaire mais pas cliqué le lien de l''email : peut-être un email arrivé en spam.');
  end if;

  -- Croquettes given much faster than spent
  select coalesce(sum(amount), 0) into n from public.treat_events where created_at > now() - interval '30 days';
  select coalesce(sum(total), 0) into m from public.store_orders where created_at > now() - interval '30 days';
  if n >= 200 and n > 5 * greatest(m, 1) then
    alerts := alerts || jsonb_build_object('level', 'info', 'key', 'economy', 'title', 'Les croquettes s''accumulent',
      'detail', n || ' données gratuitement en 30 jours, ' || m || ' dépensées. Les soldes grossissent sans être utilisés.');
  end if;

  -- Matches that don't lead to a conversation
  select count(*) into n from public.pet_matches pm where pm.created_at > now() - interval '14 days'
    and not exists (select 1 from public.pets b where b.is_bot and b.id in (pm.pet_one_id, pm.pet_two_id));
  select count(*) into m from public.pet_matches pm where pm.created_at > now() - interval '14 days'
    and not exists (select 1 from public.pets b where b.is_bot and b.id in (pm.pet_one_id, pm.pet_two_id))
    and exists (select 1 from public.match_messages mm where mm.match_id = pm.id);
  if n >= 5 and m < n / 4.0 then
    alerts := alerts || jsonb_build_object('level', 'info', 'key', 'silent_matches', 'title', 'Les matchs restent silencieux',
      'detail', 'Seulement ' || m || ' des ' || n || ' matchs de ces 14 jours ont un message.');
  end if;

  return alerts;
end;
$$;
revoke execute on function public.admin_alerts() from public, anon, authenticated;
grant execute on function public.admin_alerts() to service_role;

-- 4. The morning email ---------------------------------------------------------------------------
-- pg_net calls the admin-alerts Edge Function with the webhook secret the push already uses; the
-- function reads admin_alerts() and writes to ADMIN_EMAIL when there is a critical or warning one.
create or replace function public.send_admin_alerts()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_webhook_secret' limit 1;
  if v_secret is null then return; end if;
  perform net.http_post(
    url := 'https://mfamxvbepohyeigpnsyi.supabase.co/functions/v1/admin-alerts',
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    timeout_milliseconds := 10000
  );
end;
$$;
revoke execute on function public.send_admin_alerts() from public, anon, authenticated;

-- 06:30 UTC: 8:30 in Paris in summer, 7:30 in winter
select cron.schedule('grr-admin-alerts', '30 6 * * *', 'select public.send_admin_alerts()');

notify pgrst, 'reload schema';
