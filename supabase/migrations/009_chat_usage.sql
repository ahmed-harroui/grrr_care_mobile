-- Daily AI chat quota per user, enforced by the grrr-chat Edge Function.

create table if not exists public.chat_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  count integer not null default 0,
  primary key (user_id, day)
);

-- No policies: only the Edge Function (service role) reads or writes this table.
alter table public.chat_usage enable row level security;

-- Atomically counts one message and returns the new total for today.
create or replace function public.increment_chat_usage(p_user uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.chat_usage (user_id, day, count)
  values (p_user, current_date, 1)
  on conflict (user_id, day) do update set count = public.chat_usage.count + 1
  returning count;
$$;

revoke all on function public.increment_chat_usage(uuid) from public, anon, authenticated;
