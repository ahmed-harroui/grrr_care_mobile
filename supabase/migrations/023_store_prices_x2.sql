-- The store's prices doubled, and so did the croquettes of the packs bought (store-checkout's PACKS):
-- the euro prices stay the same, while the croquettes the apps give for free are worth half.
-- 1 croquette = 0,25 € when bought. Safe to run again.
update public.store_items set croquettes = v.croquettes
from (values ('colliers', 100), ('medailles', 80), ('jouets', 70), ('friandises', 50), ('gourde', 70)) as v(slug, croquettes)
where store_items.slug = v.slug;
select slug, croquettes from public.store_items order by slug;
