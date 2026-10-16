-- Birthdays with the age and the birth date, and a weekly challenge. Safe to run again.
--   * the birthday: "Luna a 5 ans aujourd'hui ! 🎂" with the birth date, and a week before to get ready;
--   * Wednesday: the week's challenge for the pet's species (the home screen has one a day).
-- The two helpers are shared with GRRRR (its migration 029 has the same definitions).
-- Everything else in send_care_reminders is as in migration 021 (at most 2 messages a day for a pet).

-- Shared by GRRR Care (migration 025) and GRRRR (migration 029): birthdays and challenges.

-- A birthday in a given year (29 February falls on the 28th in other years).
create or replace function public.pet_birthday_in_year(p_birthday date, p_year integer)
returns date
language sql
immutable
as $$
  select case
    when extract(month from p_birthday) = 2 and extract(day from p_birthday) = 29
      and not (p_year % 4 = 0 and (p_year % 100 <> 0 or p_year % 400 = 0)) then make_date(p_year, 2, 28)
    else make_date(p_year, extract(month from p_birthday)::integer, extract(day from p_birthday)::integer)
  end
$$;

-- The birthday notification of a pet for today: on the day (with its age and birth date), and a
-- week before to get ready. Null on the other days, and for a pet not yet one year old.
create or replace function public.pet_birthday_notice(p_name text, p_birthday date, p_today date)
returns jsonb
language plpgsql
immutable
as $$
declare
  months_fr text[] := array['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  months_en text[] := array['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  next_day date;
  days integer;
  age integer;
  born_fr text;
  born_en text;
  on_fr text;
  on_en text;
  age_fr text;
  age_en text;
begin
  if p_birthday is null or p_birthday > p_today then return null; end if;
  next_day := public.pet_birthday_in_year(p_birthday, extract(year from p_today)::integer);
  if next_day < p_today then next_day := public.pet_birthday_in_year(p_birthday, extract(year from p_today)::integer + 1); end if;
  days := next_day - p_today;
  age := extract(year from next_day)::integer - extract(year from p_birthday)::integer;
  if age < 1 or days not in (0, 7) then return null; end if;

  on_fr := case when extract(day from p_birthday) = 1 then '1er' else extract(day from p_birthday)::text end || ' ' || months_fr[extract(month from p_birthday)::integer];
  on_en := extract(day from p_birthday)::text || ' ' || months_en[extract(month from p_birthday)::integer];
  born_fr := on_fr || ' ' || extract(year from p_birthday)::text;
  born_en := on_en || ' ' || extract(year from p_birthday)::text;
  age_fr := age || ' an' || case when age > 1 then 's' else '' end;
  age_en := age || ' year' || case when age > 1 then 's' else '' end || ' old';

  if days = 0 then
    return jsonb_build_object('key', 'birthday:' || extract(year from next_day), 'icon', '🎂',
      -- The icon is put before the title by the push (send-push): none in the text
      'titleFr', p_name || ' a ' || age_fr || ' aujourd''hui !', 'titleEn', p_name || ' is ' || age_en || ' today!',
      'bodyFr', 'Le ' || born_fr || ', une belle histoire commençait. Une balade, une friandise… et une photo pour son album 📸',
      'bodyEn', 'On ' || born_en || ', a great story began. A walk, a treat… and a photo for the album 📸');
  end if;
  return jsonb_build_object('key', 'birthday7:' || extract(year from next_day), 'icon', '🎁',
    'titleFr', 'Dans 7 jours, ' || p_name || ' aura ' || age_fr, 'titleEn', 'In 7 days, ' || p_name || ' turns ' || age,
    'bodyFr', 'Son anniversaire tombe le ' || on_fr || '. De quoi préparer une petite surprise !',
    'bodyEn', 'The birthday is on ' || on_en || '. Time to plan a little surprise!');
end;
$$;

-- A challenge for the pet's species, a different one each time `p_turn` changes (the app's home
-- screen has the full list: src/lib/challenges.ts in GRRR Care).
create or replace function public.pet_challenge(p_species text, p_turn integer)
returns jsonb
language plpgsql
immutable
as $$
declare
  s text := lower(coalesce(p_species, ''));
  pool jsonb[];
begin
  pool := case
    when s ~ 'dog|chien' then array[
      jsonb_build_object('icon', '🔎', 'fr', 'Cache 3 croquettes dans la pièce et laisse-le les trouver.', 'en', 'Hide 3 treats in the room and let them sniff them out.'),
      jsonb_build_object('icon', '🌿', 'fr', 'Un nouvel itinéraire de balade : nouvelles odeurs, cerveau ravi.', 'en', 'A new walking route: new smells, happy brain.'),
      jsonb_build_object('icon', '✋', 'fr', 'Apprends-lui « touche » : le museau dans ta main, puis une récompense.', 'en', 'Teach "touch": nose in your hand, then a reward.'),
      jsonb_build_object('icon', '🪢', 'fr', 'Tir à la corde, puis « lâche » contre une friandise.', 'en', 'Tug of war, then "drop it" for a treat.'),
      jsonb_build_object('icon', '🐾', 'fr', 'Vérifie ses coussinets au retour de balade.', 'en', 'Check the paw pads after the walk.')]
    when s ~ 'cat|chat' then array[
      jsonb_build_object('icon', '🪶', 'fr', 'Une plume au bout d''une ficelle : 10 minutes de chasse.', 'en', 'A feather on a string: 10 minutes of hunting.'),
      jsonb_build_object('icon', '📦', 'fr', 'Un carton vide dans le salon. Observe.', 'en', 'An empty box in the living room. Watch.'),
      jsonb_build_object('icon', '🥤', 'fr', 'Une friandise cachée sous un gobelet : à lui de la trouver.', 'en', 'A treat hidden under a cup: their turn to find it.'),
      jsonb_build_object('icon', '🎣', 'fr', 'Une séance de jeu avant le dîner, puis le repas : comme une vraie chasse.', 'en', 'Play before dinner, then the meal: like a real hunt.'),
      jsonb_build_object('icon', '😌', 'fr', 'Cligne lentement des yeux vers lui : ça veut dire « j''ai confiance ».', 'en', 'Blink slowly at them: it means "I trust you".')]
    when s ~ 'rabbit|lapin' then array[
      jsonb_build_object('icon', '🐇', 'fr', 'Une heure de course libre dans une pièce sécurisée.', 'en', 'An hour of free running in a safe room.'),
      jsonb_build_object('icon', '🌾', 'fr', 'Des herbes cachées dans le foin : à lui de fouiller.', 'en', 'Herbs hidden in the hay: foraging time.'),
      jsonb_build_object('icon', '🕳️', 'fr', 'Un tunnel en carton à explorer et à ronger.', 'en', 'A cardboard tunnel to explore and chew.')]
    when s ~ 'bird|oiseau|parrot|perroquet|perruche' then array[
      jsonb_build_object('icon', '🌰', 'fr', 'Une friandise emballée dans du papier, à déballer.', 'en', 'A treat wrapped in paper, to unwrap.'),
      jsonb_build_object('icon', '🔄', 'fr', 'Change les jouets de la cage : la nouveauté chasse l''ennui.', 'en', 'Swap the cage toys: novelty fights boredom.'),
      jsonb_build_object('icon', '💦', 'fr', 'Une douche tiède en brumisation pour le plumage.', 'en', 'A lukewarm mist shower for the feathers.')]
    when s ~ 'hamster|guinea|gerbil' then array[
      jsonb_build_object('icon', '🧩', 'fr', 'Un labyrinthe en carton avec une graine au bout.', 'en', 'A cardboard maze with a seed at the end.'),
      jsonb_build_object('icon', '🌻', 'fr', 'Sa nourriture éparpillée au lieu de la gamelle : une nuit de fouille.', 'en', 'Food scattered instead of in the bowl: a night of foraging.')]
    when s ~ 'horse|cheval|pony|poney' then array[
      jsonb_build_object('icon', '🧲', 'fr', 'Cure ses quatre sabots.', 'en', 'Pick out all four hooves.'),
      jsonb_build_object('icon', '🌳', 'fr', 'Une balade en main sur un nouveau chemin.', 'en', 'A walk in hand on a new path.')]
    when s ~ 'turtle|tortoise|tortue' then array[
      jsonb_build_object('icon', '☀️', 'fr', 'Vérifie la lampe chauffante et les UV.', 'en', 'Check the heat lamp and the UV.'),
      jsonb_build_object('icon', '🌼', 'fr', 'Pissenlit et trèfle au menu aujourd''hui.', 'en', 'Dandelion and clover on the menu today.')]
    when s ~ 'fish|poisson' then array[
      jsonb_build_object('icon', '🪣', 'fr', 'Change un quart de l''eau, à la même température.', 'en', 'Change a quarter of the water, at the same temperature.'),
      jsonb_build_object('icon', '🧪', 'fr', 'Teste l''eau de l''aquarium aujourd''hui.', 'en', 'Test the tank water today.')]
    else array[
      jsonb_build_object('icon', '🤍', 'fr', 'Quelques minutes au calme ensemble, sans écran.', 'en', 'A few quiet minutes together, no screen.'),
      jsonb_build_object('icon', '✨', 'fr', 'Un nouvel objet à explorer dans son espace.', 'en', 'A new object to explore in its space.')]
  end;
  return pool[1 + (abs(p_turn) % array_length(pool, 1))];
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
  v_notice jsonb;
  v_challenge jsonb;
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
    -- Birthday: on the day with its age and birth date, and a week before
    v_notice := public.pet_birthday_notice(r.pet_name, r.birthday::date, today);
    if v_notice is not null then
      if public.care_remind(r.pet_id, 'birthday', v_notice ->> 'key', jsonb_build_object('icon', v_notice ->> 'icon', 'channel', 'health', 'screen', 'pet',
        'titleFr', v_notice ->> 'titleFr', 'titleEn', v_notice ->> 'titleEn', 'bodyFr', v_notice ->> 'bodyFr', 'bodyEn', v_notice ->> 'bodyEn')) then sent := sent + 1; end if;
    end if;
    -- Wednesday: the week's challenge, for its species
    if extract(isodow from today) = 3 then
      v_challenge := public.pet_challenge(r.species, extract(week from today)::integer);
      if public.care_remind(r.pet_id, 'challenge', 'challenge:' || to_char(today, 'IYYY-IW'), jsonb_build_object('icon', '🎯', 'channel', 'health', 'screen', 'home',
        'titleFr', 'Défi de la semaine pour ' || r.pet_name, 'titleEn', 'This week''s challenge for ' || r.pet_name,
        'bodyFr', (v_challenge ->> 'icon') || ' ' || (v_challenge ->> 'fr'), 'bodyEn', (v_challenge ->> 'icon') || ' ' || (v_challenge ->> 'en'))) then sent := sent + 1; end if;
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

revoke execute on function public.send_care_reminders() from public, anon, authenticated;

notify pgrst, 'reload schema';
