-- A new store product: the cat wall path (bridge or platforms, five colours). Safe to run again.
insert into public.store_items (slug, name, croquettes) values ('parcours-chat', 'Parcours mural', 300)
on conflict (slug) do update set name = excluded.name, croquettes = excluded.croquettes;
select slug, croquettes, is_active from public.store_items where slug = 'parcours-chat';
