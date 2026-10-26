-- Faz 3: catalog search, per-user rate limit and atomic analysis save.
-- Every function is SECURITY INVOKER: RLS applies, no service key needed.

create extension if not exists unaccent with schema extensions;

-- ─────────────────────────────────────────────────────────────
-- Text search helpers
-- ─────────────────────────────────────────────────────────────

-- "Ispanak", "ıspanak" and "İSPANAK" all become "ispanak"; punctuation becomes spaces.
create function public.normalize_search_text(p_text text)
returns text
language sql
stable
set search_path = ''
as $$
  select trim(regexp_replace(
    regexp_replace(
      lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, ''))),
      '[^a-z0-9]+', ' ', 'g'),
    '\s+', ' ', 'g'))
$$;

-- Products relevant to free text, best first:
-- 0 exact name, 1 name starts with query, 2 name contains query,
-- 3 query contains the whole name, 4 query contains one of its substance names as a word.
create function public.search_products(
  p_query text,
  p_kinds public.product_kind[] default null,
  p_limit integer default 10
)
returns table (product_id uuid, rank integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select public.normalize_search_text(p_query) as q
  ),
  ranked as (
    select
      p.id,
      p.name,
      case
        when n.name = q.q then 0
        when n.name like q.q || '%' then 1
        when length(q.q) >= 3 and n.name like '%' || q.q || '%' then 2
        when length(n.name) >= 3 and ' ' || q.q || ' ' like '% ' || n.name || ' %' then 3
        when exists (
          select 1
          from public.product_substances ps
          join public.substances s on s.id = ps.substance_id
          cross join lateral unnest(array_prepend(s.name, s.synonyms)) as k(key)
          where ps.product_id = p.id
            and length(public.normalize_search_text(k.key)) >= 3
            and ' ' || q.q || ' ' like '% ' || public.normalize_search_text(k.key) || ' %'
        ) then 4
      end as rank
    from public.products p
    cross join q
    cross join lateral (select public.normalize_search_text(p.name) as name) n
    where q.q <> ''
      and (p_kinds is null or p.kind = any (p_kinds))
  )
  select id, rank
  from ranked
  where rank is not null
  order by rank, length(name), name
  limit greatest(1, least(coalesce(p_limit, 10), 50))
$$;

-- Substances whose name or synonym equals the text (or, for 4+ characters, starts with it).
create function public.search_substances(p_query text)
returns setof public.substances
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (select public.normalize_search_text(p_query) as q)
  select s.*
  from public.substances s
  cross join q
  where q.q <> ''
    and exists (
      select 1
      from unnest(array_prepend(s.name, s.synonyms)) as k(key)
      where public.normalize_search_text(k.key) = q.q
         or (length(q.q) >= 4 and public.normalize_search_text(k.key) like q.q || '%')
    )
  order by s.name
  limit 10
$$;

-- ─────────────────────────────────────────────────────────────
-- Rate limit: append-only event log per user.
-- Users can insert and read their own events but never update or delete them,
-- so the counter cannot be reset from the client.
-- ─────────────────────────────────────────────────────────────
create table public.analysis_rate_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index analysis_rate_events_user_id_created_at_idx
  on public.analysis_rate_events (user_id, created_at desc);

alter table public.analysis_rate_events enable row level security;
revoke all on public.analysis_rate_events from anon;
revoke update, delete, truncate on public.analysis_rate_events from authenticated;

create policy "analysis_rate_events: owner can select"
  on public.analysis_rate_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "analysis_rate_events: owner can insert"
  on public.analysis_rate_events for insert to authenticated
  with check ((select auth.uid()) = user_id);
-- No update/delete policies on purpose (see above). Rows go away with the user (cascade).

-- Records one analysis attempt and returns true while the caller is within the limit.
create function public.consume_analysis_quota(
  p_limit integer default 30,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.analysis_rate_events default values;

  select count(*) into v_count
  from public.analysis_rate_events
  where user_id = (select auth.uid())
    and created_at > now() - make_interval(secs => p_window_seconds);

  return v_count <= p_limit;
end
$$;

-- ─────────────────────────────────────────────────────────────
-- Atomic save of a run and its findings (keeps finding order).
-- ─────────────────────────────────────────────────────────────
alter table public.analysis_findings add column position integer not null default 0;

create function public.save_analysis_run(
  p_input_kind public.input_kind,
  p_strategy_codes text[],
  p_findings jsonb,
  p_meal_id uuid default null
)
returns uuid
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_run_id uuid;
begin
  insert into public.analysis_runs (meal_id, input_kind, strategy_codes)
  values (p_meal_id, p_input_kind, coalesce(p_strategy_codes, '{}'))
  returning id into v_run_id;

  insert into public.analysis_findings (run_id, position, step, status, title, detail, interaction_id)
  select
    v_run_id,
    e.ord::integer,
    (e.value ->> 'step')::public.analysis_step,
    (e.value ->> 'status')::public.finding_status,
    e.value ->> 'title',
    e.value ->> 'detail',
    (e.value ->> 'interaction_id')::uuid
  from jsonb_array_elements(coalesce(p_findings, '[]'::jsonb)) with ordinality as e(value, ord);

  return v_run_id;
end
$$;

-- Only signed-in users may call these.
revoke execute on function public.normalize_search_text(text) from public, anon;
revoke execute on function public.search_products(text, public.product_kind[], integer) from public, anon;
revoke execute on function public.search_substances(text) from public, anon;
revoke execute on function public.consume_analysis_quota(integer, integer) from public, anon;
revoke execute on function public.save_analysis_run(public.input_kind, text[], jsonb, uuid) from public, anon;
grant execute on function public.normalize_search_text(text) to authenticated;
grant execute on function public.search_products(text, public.product_kind[], integer) to authenticated;
grant execute on function public.search_substances(text) to authenticated;
grant execute on function public.consume_analysis_quota(integer, integer) to authenticated;
grant execute on function public.save_analysis_run(public.input_kind, text[], jsonb, uuid) to authenticated;
