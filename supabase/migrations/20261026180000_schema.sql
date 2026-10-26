-- NutriDose schema: catalog (read-only for users) + user data (owner-only).
-- RLS is enabled on every table. Catalog writes happen only with the service role, which bypasses RLS.

-- ─────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────
create type public.substance_kind as enum ('active_ingredient', 'nutrient', 'compound');
create type public.product_kind   as enum ('drug', 'food', 'supplement');
create type public.severity       as enum ('info', 'caution', 'high', 'contraindicated');
create type public.limit_period   as enum ('day');
create type public.allergy_kind   as enum ('allergy', 'intolerance');
create type public.input_kind     as enum ('barcode', 'manual', 'prescription_pdf');
create type public.analysis_step  as enum ('ingredient_scan', 'drug_food', 'dose_limit', 'tolerance_allergy');
create type public.finding_status as enum ('pass', 'caution', 'high', 'error');

-- ─────────────────────────────────────────────────────────────
-- Catalog tables
-- ─────────────────────────────────────────────────────────────
create table public.substances (
  id       uuid primary key default gen_random_uuid(),
  name     text not null unique check (length(trim(name)) > 0),
  synonyms text[] not null default '{}',
  kind     public.substance_kind not null
);

create table public.products (
  id      uuid primary key default gen_random_uuid(),
  kind    public.product_kind not null,
  name    text not null check (length(trim(name)) > 0),
  barcode text unique,
  brand   text,
  source  text
);

create table public.product_substances (
  product_id   uuid not null references public.products (id) on delete cascade,
  substance_id uuid not null references public.substances (id) on delete restrict,
  amount       numeric check (amount is null or amount >= 0),
  unit         text,
  primary key (product_id, substance_id)
);
create index product_substances_substance_id_idx on public.product_substances (substance_id);

create table public.conditions (
  id   uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table public.interactions (
  id              uuid primary key default gen_random_uuid(),
  substance_a     uuid not null references public.substances (id) on delete restrict,
  substance_b     uuid not null references public.substances (id) on delete restrict,
  severity        public.severity not null,
  condition_code  text references public.conditions (code) on update cascade on delete restrict,
  mechanism       text,
  advice          text,
  evidence_source text not null check (length(trim(evidence_source)) > 0),
  reviewed_at     date,
  check (substance_a <> substance_b)
);
create index interactions_substance_a_idx on public.interactions (substance_a);
create index interactions_substance_b_idx on public.interactions (substance_b);
create index interactions_condition_code_idx on public.interactions (condition_code);
-- One row per substance pair (in either order) per condition.
create unique index interactions_pair_condition_uidx on public.interactions (
  least(substance_a, substance_b), greatest(substance_a, substance_b), coalesce(condition_code, '')
);

create table public.nutrient_limits (
  id             uuid primary key default gen_random_uuid(),
  substance_id   uuid not null references public.substances (id) on delete restrict,
  condition_code text references public.conditions (code) on update cascade on delete restrict,
  upper_limit    numeric not null check (upper_limit > 0),
  unit           text not null,
  period         public.limit_period not null default 'day',
  source         text not null check (length(trim(source)) > 0)
);
create index nutrient_limits_substance_id_idx on public.nutrient_limits (substance_id);
create index nutrient_limits_condition_code_idx on public.nutrient_limits (condition_code);
create unique index nutrient_limits_substance_condition_uidx
  on public.nutrient_limits (substance_id, coalesce(condition_code, ''), period);

create table public.allergens (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null unique,
  cross_reactive_substances uuid[] not null default '{}'
);

-- Treatment profiles are fixed reference codes used by the domain strategies.
insert into public.conditions (code, name) values
  ('cardiology',        'Kardiyoloji'),
  ('diabetes_insulin',  'Diyabet / İnsülin'),
  ('transplant_immuno', 'Transplant / İmmünsüpresyon'),
  ('hypertension',      'Hipertansiyon'),
  ('renal',             'Böbrek hastalığı');

-- ─────────────────────────────────────────────────────────────
-- User tables. user_id defaults to the caller; child tables carry user_id
-- too and reference the parent by (id, user_id) so a row can never point
-- at another user's parent.
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  user_id      uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

create table public.user_conditions (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  condition_code text not null references public.conditions (code) on update cascade on delete restrict,
  primary key (user_id, condition_code)
);
create index user_conditions_condition_code_idx on public.user_conditions (condition_code);

create table public.user_allergies (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  allergen_id uuid references public.allergens (id) on delete restrict,
  free_text   text,
  kind        public.allergy_kind not null,
  check (allergen_id is not null or length(trim(free_text)) > 0)
);
create index user_allergies_user_id_idx on public.user_allergies (user_id);
create index user_allergies_allergen_id_idx on public.user_allergies (allergen_id);

create table public.user_medications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  dose       text,
  schedule   jsonb not null default '{}',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create index user_medications_user_id_idx on public.user_medications (user_id);
create index user_medications_product_id_idx on public.user_medications (product_id);

create table public.meals (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  eaten_at timestamptz not null default now(),
  label    text,
  unique (id, user_id)
);
create index meals_user_id_eaten_at_idx on public.meals (user_id, eaten_at desc);

create table public.meal_items (
  id         uuid primary key default gen_random_uuid(),
  meal_id    uuid not null,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id uuid references public.products (id) on delete restrict,
  raw_text   text not null,
  quantity   numeric check (quantity is null or quantity > 0),
  unit       text,
  foreign key (meal_id, user_id) references public.meals (id, user_id) on delete cascade
);
create index meal_items_meal_id_user_id_idx on public.meal_items (meal_id, user_id);
create index meal_items_user_id_idx on public.meal_items (user_id);
create index meal_items_product_id_idx on public.meal_items (product_id);

create table public.analysis_runs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  meal_id        uuid,
  input_kind     public.input_kind not null,
  strategy_codes text[] not null default '{}',
  created_at     timestamptz not null default now(),
  unique (id, user_id),
  -- meal_id may be null; the FK only applies when it is set.
  foreign key (meal_id, user_id) references public.meals (id, user_id) on delete set null (meal_id)
);
create index analysis_runs_user_id_created_at_idx on public.analysis_runs (user_id, created_at desc);
create index analysis_runs_meal_id_user_id_idx on public.analysis_runs (meal_id, user_id);

create table public.analysis_findings (
  id             uuid primary key default gen_random_uuid(),
  run_id         uuid not null,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  step           public.analysis_step not null,
  status         public.finding_status not null,
  title          text not null,
  detail         text,
  interaction_id uuid references public.interactions (id) on delete set null,
  foreign key (run_id, user_id) references public.analysis_runs (id, user_id) on delete cascade
);
create index analysis_findings_run_id_user_id_idx on public.analysis_findings (run_id, user_id);
create index analysis_findings_user_id_idx on public.analysis_findings (user_id);
create index analysis_findings_interaction_id_idx on public.analysis_findings (interaction_id);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table public.substances         enable row level security;
alter table public.products           enable row level security;
alter table public.product_substances enable row level security;
alter table public.conditions         enable row level security;
alter table public.interactions       enable row level security;
alter table public.nutrient_limits    enable row level security;
alter table public.allergens          enable row level security;
alter table public.profiles           enable row level security;
alter table public.user_conditions    enable row level security;
alter table public.user_allergies     enable row level security;
alter table public.user_medications   enable row level security;
alter table public.meals              enable row level security;
alter table public.meal_items         enable row level security;
alter table public.analysis_runs      enable row level security;
alter table public.analysis_findings  enable row level security;

-- Catalog: authenticated users read; nobody but the service role writes.
do $$
declare t text;
begin
  foreach t in array array[
    'substances', 'products', 'product_substances', 'conditions',
    'interactions', 'nutrient_limits', 'allergens'
  ] loop
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke insert, update, delete, truncate on public.%I from authenticated', t);
    execute format(
      'create policy "%1$s: authenticated can read" on public.%1$I for select to authenticated using (true)', t);
  end loop;
end $$;

-- User data: owner only, one policy per command.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'user_conditions', 'user_allergies', 'user_medications',
    'meals', 'meal_items', 'analysis_runs', 'analysis_findings'
  ] loop
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke truncate on public.%I from authenticated', t);
    execute format(
      'create policy "%1$s: owner can select" on public.%1$I for select to authenticated '
      'using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s: owner can insert" on public.%1$I for insert to authenticated '
      'with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s: owner can update" on public.%1$I for update to authenticated '
      'using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s: owner can delete" on public.%1$I for delete to authenticated '
      'using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;
