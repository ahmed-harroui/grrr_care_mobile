-- How an existing account signs in (email and password, Google…). Safe to run again.
-- Creating an account with an email that already has one says so anyway (the sign-up answers
-- "already registered"): this only tells the apps which way to send the person, so that an account
-- made with "Continue with Google" is not asked for a password it never had.
create or replace function public.sign_in_methods(p_email text)
returns text[]
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(array_agg(distinct i.provider order by i.provider), '{}')
  from auth.users u join auth.identities i on i.user_id = u.id
  where lower(u.email) = lower(trim(p_email))
$$;
revoke execute on function public.sign_in_methods(text) from public;
grant execute on function public.sign_in_methods(text) to anon, authenticated;

notify pgrst, 'reload schema';
