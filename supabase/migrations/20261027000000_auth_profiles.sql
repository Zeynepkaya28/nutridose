-- Faz 5: profile row on sign-up, onboarding state.

-- Internal functions live in a schema the Data API does not expose.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.profiles add column onboarded_at timestamptz;

-- Creates the profile row when a user signs up (magic link, Apple, admin API).
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Users who existed before this migration.
insert into public.profiles (user_id, display_name)
select id, split_part(coalesce(email, ''), '@', 1) from auth.users
on conflict (user_id) do nothing;
