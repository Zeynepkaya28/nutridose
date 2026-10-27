-- Faz 6: explicit consent (KVKK) before any health data is stored, and publishing rules for interactions.

-- ─────────────────────────────────────────────────────────────
-- 1. Explicit consent
-- ─────────────────────────────────────────────────────────────
alter table public.profiles
  add column health_consent_at timestamptz,
  add column health_consent_version text,
  add constraint profiles_consent_complete
    check ((health_consent_at is null) = (health_consent_version is null));

-- True when the caller has given explicit consent to process health data.
create function public.has_health_consent()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where user_id = (select auth.uid()) and health_consent_at is not null
  )
$$;

revoke execute on function public.has_health_consent() from public, anon;
grant execute on function public.has_health_consent() to authenticated;

-- Health-data tables: writes need consent (reads and deletes do not, so users can always see and erase their data).
do $$
declare t text;
begin
  foreach t in array array[
    'user_conditions', 'user_allergies', 'user_medications',
    'meals', 'meal_items', 'analysis_runs', 'analysis_findings'
  ] loop
    execute format('drop policy "%1$s: owner can insert" on public.%1$I', t);
    execute format('drop policy "%1$s: owner can update" on public.%1$I', t);
    execute format(
      'create policy "%1$s: owner with consent can insert" on public.%1$I for insert to authenticated '
      'with check ((select auth.uid()) = user_id and (select public.has_health_consent()))', t);
    execute format(
      'create policy "%1$s: owner with consent can update" on public.%1$I for update to authenticated '
      'using ((select auth.uid()) = user_id) '
      'with check ((select auth.uid()) = user_id and (select public.has_health_consent()))', t);
  end loop;
end $$;

-- Prescriptions are health data too.
drop policy "prescriptions: owner can insert" on storage.objects;
create policy "prescriptions: owner with consent can insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'prescriptions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f-]{36}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
    and (select public.has_health_consent())
  );

-- ─────────────────────────────────────────────────────────────
-- 2. Interactions are only visible once published, and cannot be published
--    without an evidence source and a review date.
-- ─────────────────────────────────────────────────────────────
alter table public.interactions
  add column status text not null default 'draft'
    constraint interactions_status_valid check (status in ('draft', 'published')),
  add constraint interactions_published_requires_review
    check (
      status <> 'published'
      or (evidence_source is not null and length(trim(evidence_source)) > 0 and reviewed_at is not null)
    );

create index interactions_status_idx on public.interactions (status);

drop policy "interactions: authenticated can read" on public.interactions;
create policy "interactions: authenticated can read published"
  on public.interactions for select to authenticated
  using (status = 'published');
