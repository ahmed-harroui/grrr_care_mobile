-- The treatment-review advice says what to do. Safe to run again.
-- The rule itself changed in the app (src/lib/health-score/engine.ts): a treatment only needs a vet
-- visit once it has run longer than the review period (it was prescribed at a visit).
update public.health_profiles h
set categories = (
  select jsonb_agg(
    jsonb_set(cat, '{rules}', (
      select jsonb_agg(case when rule ->> 'id' = 'treatments_reviewed'
        then jsonb_set(rule, '{advice}', jsonb_build_object(
          'en', 'A treatment running for months has had no vet visit since: add the last visit, or book one.',
          'fr', 'Un traitement en cours depuis plusieurs mois n’a pas eu de visite vétérinaire depuis : ajoute la dernière visite, ou prends rendez-vous.'))
        else rule end order by rule_order)
      from jsonb_array_elements(cat -> 'rules') with ordinality as r(rule, rule_order)
    )) order by cat_order)
  from jsonb_array_elements(h.categories) with ordinality as c(cat, cat_order)
)
where exists (select 1 from jsonb_array_elements(h.categories) cat, jsonb_array_elements(cat -> 'rules') rule where rule ->> 'id' = 'treatments_reviewed');

select id, (select rule -> 'advice' ->> 'fr' from jsonb_array_elements(categories) cat, jsonb_array_elements(cat -> 'rules') rule where rule ->> 'id' = 'treatments_reviewed') as advice
from public.health_profiles order by id;
