-- The admin dashboard's numbers (www.greatrascals.com/dashboard), in one call. Safe to run again.
-- Read only: everything comes from what the apps already store, nothing is tracked for it.
-- Only the server (service role) may call it; the page checks that the visitor is an admin.

-- One count per day over the last `p_days` days, for a table's date column (oldest first).
create or replace function public.admin_daily(p_table text, p_column text, p_days integer, p_where text default 'true', p_value text default 'count(*)')
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  result jsonb;
begin
  execute format(
    'select coalesce(jsonb_agg(coalesce(c.n, 0) order by d.day), ''[]'')
     from generate_series((now() at time zone ''Europe/Paris'')::date - %s + 1, (now() at time zone ''Europe/Paris'')::date, interval ''1 day'') as d(day)
     left join (select (%I at time zone ''Europe/Paris'')::date as day, %s as n from %s where %I >= now() - interval ''%s days'' and %s group by 1) c on c.day = d.day',
    p_days, p_column, p_value, p_table, p_column, p_days + 1, p_where)
  into result;
  return result;
end;
$$;

create or replace function public.admin_dashboard(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  real_pet text := 'not coalesce(is_bot, false) and not coalesce(setup_pending, false) and not coalesce(adopter_only, false)';
  -- The demo profiles (bots) like and write too: only what real pets do is counted
  not_bot text := 'not exists (select 1 from public.pets b where b.is_bot and b.id = %s)';
begin
  return jsonb_build_object(
    'generatedAt', now(),
    'days', p_days,

    'accounts', jsonb_build_object(
      'total', (select count(*) from auth.users),
      'new', public.admin_daily('auth.users', 'created_at', p_days),
      'signIns', public.admin_daily('auth.users', 'last_sign_in_at', p_days),
      'active7', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
      'active30', (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
      -- Came back: signed in again more than a day after creating the account
      'cameBack', (select count(*) from auth.users where last_sign_in_at > created_at + interval '1 day'),
      'google', (select count(distinct user_id) from auth.identities where provider = 'google'),
      'phones', jsonb_build_object(
        'grrrr', (select count(distinct user_id) from public.push_tokens where coalesce(app, 'grrrr') = 'grrrr'),
        'care', (select count(distinct user_id) from public.push_tokens where app = 'care')),
      -- From an account to a real conversation
      'funnel', jsonb_build_array(
        jsonb_build_object('label', 'Comptes', 'value', (select count(*) from auth.users)),
        jsonb_build_object('label', 'Avec un vrai compagnon', 'value', (select count(distinct owner_id) from public.pets p where not coalesce(p.is_bot, false) and not coalesce(p.setup_pending, false))),
        jsonb_build_object('label', 'Avec un match', 'value', (select count(distinct p.owner_id) from public.pets p join public.pet_matches m on p.id in (m.pet_one_id, m.pet_two_id) where not coalesce(p.is_bot, false))),
        jsonb_build_object('label', 'Avec un message envoyé', 'value', (select count(distinct p.owner_id) from public.pets p join public.match_messages mm on mm.sender_pet_id = p.id where not coalesce(p.is_bot, false))))
    ),

    'pets', jsonb_build_object(
      'total', (select count(*) from public.pets where not coalesce(is_bot, false) and not coalesce(setup_pending, false)),
      'new', public.admin_daily('public.pets', 'created_at', p_days, real_pet),
      'species', (select coalesce(jsonb_agg(jsonb_build_object('label', species, 'value', n) order by n desc), '[]')
                  from (select lower(coalesce(species, '?')) as species, count(*) as n from public.pets where not coalesce(is_bot, false) and not coalesce(setup_pending, false) group by 1) s)
    ),

    'grrrr', jsonb_build_object(
      'likes', public.admin_daily('public.pet_swipes', 'created_at', p_days, 'upper(action) in (''LIKE'', ''SUPER_LIKE'') and ' || format(not_bot, 'from_pet_id')),
      'matches', public.admin_daily('public.pet_matches', 'created_at', p_days),
      'messages', public.admin_daily('public.match_messages', 'created_at', p_days, format(not_bot, 'sender_pet_id')),
      'outings', public.admin_daily('public.meeting_proposals', 'created_at', p_days),
      'totals', jsonb_build_object(
        'likes', (select count(*) from public.pet_swipes s where upper(action) in ('LIKE', 'SUPER_LIKE') and not exists (select 1 from public.pets b where b.is_bot and b.id = s.from_pet_id)),
        'matches', (select count(*) from public.pet_matches),
        'messages', (select count(*) from public.match_messages mm where not exists (select 1 from public.pets b where b.is_bot and b.id = mm.sender_pet_id)),
        'outingsProposed', (select count(*) from public.meeting_proposals),
        'outingsAccepted', (select count(*) from public.meeting_proposals where status = 'accepted' or accepted_at is not null),
        'onMap', (select count(*) from public.pet_locations where updated_at > now() - interval '7 days'),
        'rehoming', (select count(*) from public.rehoming_listings),
        'adoptionRequests', (select count(*) from public.adoption_interests) + (select count(*) from public.rehoming_requests))
    ),

    'care', jsonb_build_object(
      'records', jsonb_build_object(
        'vaccinations', public.admin_daily('public.vaccinations', 'created_at', p_days),
        'medications', public.admin_daily('public.medications', 'created_at', p_days),
        'visits', public.admin_daily('public.vet_visits', 'created_at', p_days),
        'plan', public.admin_daily('public.care_plan', 'created_at', p_days)),
      'assistant', public.admin_daily('public.chat_usage', 'day', p_days, 'true', 'sum(count)'),
      'games', public.admin_daily('public.care_game_runs', 'created_at', p_days),
      'totals', jsonb_build_object(
        'vaccinations', (select count(*) from public.vaccinations),
        'medications', (select count(*) from public.medications),
        'visits', (select count(*) from public.vet_visits),
        'documents', (select count(*) from public.pet_documents),
        'wandPets', (select count(distinct pet_id) from public.care_plan where source = 'wand'),
        'planDone', (select count(*) from public.care_plan where done_at is not null),
        'petsFollowed', (select count(distinct pet_id) from (select pet_id from public.vaccinations union select pet_id from public.medications union select pet_id from public.vet_visits) f),
        'questions', (select coalesce(sum(count), 0) from public.chat_usage),
        'reports', (select count(*) from public.ai_reports),
        'games', (select count(*) from public.care_game_runs),
        'players', (select count(distinct user_id) from public.care_game_runs),
        'remindersSent', (select count(*) from public.care_notifications))
    ),

    'store', jsonb_build_object(
      'orders', public.admin_daily('public.store_orders', 'created_at', p_days),
      'revenue', public.admin_daily('public.croquette_purchases', 'created_at', p_days, 'true', 'sum(amount_cents)'),
      'totals', jsonb_build_object(
        'orders', (select count(*) from public.store_orders),
        'croquettesSpent', (select coalesce(sum(total), 0) from public.store_orders),
        'purchases', (select count(*) from public.croquette_purchases),
        'revenueCents', (select coalesce(sum(amount_cents), 0) from public.croquette_purchases)),
      'top', (select coalesce(jsonb_agg(jsonb_build_object('label', name, 'value', n) order by n desc), '[]')
              from (select item ->> 'name' as name, sum(coalesce((item ->> 'quantity')::integer, 1)) as n
                    from public.store_orders o, jsonb_array_elements(o.items) item group by 1 order by 2 desc limit 6) t)
    ),

    'rewards', jsonb_build_object(
      'claims', public.admin_daily('public.reward_claims', 'created_at', p_days),
      'given', (select coalesce(jsonb_agg(jsonb_build_object('label', reason, 'value', n) order by n desc), '[]')
                from (select reason, sum(amount) as n from public.treat_events group by 1) r),
      'givenTotal', (select coalesce(sum(amount), 0) from public.treat_events),
      'spentTotal', (select coalesce(sum(total), 0) from public.store_orders),
      'bought', (select coalesce(sum(croquettes), 0) from public.croquette_purchases),
      'bestStreak', (select coalesce(max(best), 0) from public.daily_streaks)
    ),

    'partners', jsonb_build_object(
      'places', (select count(*) from public.partners where is_published),
      'partners', (select count(*) from public.partners where is_partner),
      'invites', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) as n from public.partner_invites group by 1) i),
      'applications', (select count(*) from public.partner_applications),
      'products', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) as n from public.store_products group by 1) p),
      'answers', public.admin_daily('public.partner_invites', 'answered_at', p_days, 'status in (''accepted'', ''declined'')')
    ),

    'community', jsonb_build_object(
      'threads', (select count(*) from public.grr_threads),
      'comments', (select count(*) from public.grr_comments),
      'members', (select count(*) from public.grr_members),
      'newThreads', public.admin_daily('public.grr_threads', 'created_at', p_days)
    )
  );
end;
$$;

revoke execute on function public.admin_daily(text, text, integer, text, text) from public, anon, authenticated;
revoke execute on function public.admin_dashboard(integer) from public, anon, authenticated;
grant execute on function public.admin_dashboard(integer) to service_role;
grant execute on function public.admin_daily(text, text, integer, text, text) to service_role;

notify pgrst, 'reload schema';
