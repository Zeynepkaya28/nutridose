-- Faz 4: store what the screens need to show a saved analysis without re-running it.
alter table public.analysis_runs add column requires_alert boolean not null default false;
alter table public.analysis_findings add column severity public.severity;
alter table public.analysis_findings add column message text;

drop function public.save_analysis_run(public.input_kind, text[], jsonb, uuid);

-- Saves the run, its findings (in order) and, for a meal, the analysed items — in one transaction.
create function public.save_analysis_run(
  p_input_kind public.input_kind,
  p_strategy_codes text[],
  p_findings jsonb,
  p_requires_alert boolean default false,
  p_meal_id uuid default null,
  p_meal_items jsonb default '[]'::jsonb
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
  insert into public.analysis_runs (meal_id, input_kind, strategy_codes, requires_alert)
  values (p_meal_id, p_input_kind, coalesce(p_strategy_codes, '{}'), coalesce(p_requires_alert, false))
  returning id into v_run_id;

  insert into public.analysis_findings
    (run_id, position, step, status, severity, title, detail, message, interaction_id)
  select
    v_run_id,
    e.ord::integer,
    (e.value ->> 'step')::public.analysis_step,
    (e.value ->> 'status')::public.finding_status,
    (e.value ->> 'severity')::public.severity,
    e.value ->> 'title',
    e.value ->> 'detail',
    e.value ->> 'message',
    (e.value ->> 'interaction_id')::uuid
  from jsonb_array_elements(coalesce(p_findings, '[]'::jsonb)) with ordinality as e(value, ord);

  if p_meal_id is not null then
    insert into public.meal_items (meal_id, product_id, raw_text)
    select p_meal_id, (i.value ->> 'product_id')::uuid, i.value ->> 'raw_text'
    from jsonb_array_elements(coalesce(p_meal_items, '[]'::jsonb)) as i(value);
  end if;

  return v_run_id;
end
$$;

revoke execute on function public.save_analysis_run(public.input_kind, text[], jsonb, boolean, uuid, jsonb) from public, anon;
grant execute on function public.save_analysis_run(public.input_kind, text[], jsonb, boolean, uuid, jsonb) to authenticated;
