-- 1. A meal can be marked as skipped ("Kahvaltı yapmadım") without any items or analysis.
alter table public.meals add column skipped boolean not null default false;

-- 2. Self-service account deletion without the service-role key.
-- The caller can only ever delete their own auth user; every public table cascades from auth.users.
-- Prescription files are removed by the app with the user's own session before this is called.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  delete from auth.users where id = v_user;
end
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 3. Product search also matches the brand inside longer text ("Coumadin 5 mg 1x1" → Coumadin),
--    which is how drugs appear on prescriptions and how people type them.
create or replace function public.search_products(
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
        when length(b.brand) >= 3 and ' ' || q.q || ' ' like '% ' || b.brand || ' %' then 3
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
    cross join lateral (select public.normalize_search_text(p.brand) as brand) b
    where q.q <> ''
      and (p_kinds is null or p.kind = any (p_kinds))
  )
  select id, rank
  from ranked
  where rank is not null
  order by rank, length(name), name
  limit greatest(1, least(coalesce(p_limit, 10), 50))
$$;
