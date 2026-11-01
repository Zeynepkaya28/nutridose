-- RLS isolation test with two users. Run: npm run db:test
begin;
create extension if not exists pgtap with schema extensions;
select plan(37);

-- Two test users.
insert into auth.users (id, instance_id, aud, role, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.local'),
  ('bbbbbbbb-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.local');

-- Both test users give explicit consent (KVKK); C below does not.
update public.profiles set health_consent_at = now(), health_consent_version = 'test'
where user_id in ('aaaaaaaa-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000002');

-- Sign-up trigger created both profiles.
select is((select count(*) from public.profiles where user_id in ('aaaaaaaa-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000002')), 2::bigint, 'sign-up trigger creates profiles');

-- Own catalog fixture (independent of seed.sql).
insert into public.substances (id, name, kind) values ('cccccccc-0000-4000-8000-000000000001', 'TEST madde', 'nutrient');
insert into public.products (id, kind, name) values ('cccccccc-0000-4000-8000-000000000002', 'food', 'TEST ürün');

-- ── User A writes data ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);

update public.profiles set display_name = 'A' where user_id = 'aaaaaaaa-0000-4000-8000-000000000001';
insert into public.user_conditions (condition_code) values ('cardiology');
insert into public.user_allergies (free_text, kind) values ('fıstık', 'allergy');
insert into public.user_medications (product_id, dose) values ('cccccccc-0000-4000-8000-000000000002', '1x1');
insert into public.meals (id, label) values ('aaaaaaaa-1111-4000-8000-000000000001', 'A kahvaltı');
insert into public.meal_items (meal_id, raw_text) values ('aaaaaaaa-1111-4000-8000-000000000001', 'ıspanak');
insert into public.analysis_runs (id, meal_id, input_kind) values ('aaaaaaaa-2222-4000-8000-000000000001', 'aaaaaaaa-1111-4000-8000-000000000001', 'manual');
insert into public.analysis_findings (run_id, step, status, title) values ('aaaaaaaa-2222-4000-8000-000000000001', 'drug_food', 'caution', 'test');

select is((select count(*) from public.meals), 1::bigint, 'A sees own meal');
select is((select display_name from public.profiles), 'A', 'A can update own profile');
select is((select count(*) from public.analysis_findings), 1::bigint, 'A sees own finding');
select ok((select count(*) from public.substances) > 0, 'authenticated can read catalog');
select throws_ok(
  $$insert into public.substances (name, kind) values ('hack', 'nutrient')$$,
  '42501', null, 'authenticated cannot write catalog');
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id) values ('prescriptions', 'aaaaaaaa-0000-4000-8000-000000000001/not-a-uuid.pdf', 'aaaaaaaa-0000-4000-8000-000000000001')$$,
  '42501', null, 'storage rejects wrong file name shape');
select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner_id) values ('prescriptions', 'aaaaaaaa-0000-4000-8000-000000000001/dddddddd-0000-4000-8000-000000000001.pdf', 'aaaaaaaa-0000-4000-8000-000000000001')$$,
  'A can upload to own folder');

-- ── User B cannot see or change A's rows ──
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-4000-8000-000000000002","role":"authenticated"}', true);

select is((select count(*) from public.profiles where user_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 0::bigint, 'B cannot read A profile');
select is((select count(*) from public.user_conditions),   0::bigint, 'B cannot read A conditions');
select is((select count(*) from public.user_allergies),    0::bigint, 'B cannot read A allergies');
select is((select count(*) from public.user_medications),  0::bigint, 'B cannot read A medications');
select is((select count(*) from public.meals),             0::bigint, 'B cannot read A meals');
select is((select count(*) from public.meal_items),        0::bigint, 'B cannot read A meal items');
select is((select count(*) from public.analysis_runs),     0::bigint, 'B cannot read A runs');
select is((select count(*) from public.analysis_findings), 0::bigint, 'B cannot read A findings');
select is((select count(*) from storage.objects where bucket_id = 'prescriptions'), 0::bigint, 'B cannot list A prescriptions');

update public.meals set label = 'hacked' where id = 'aaaaaaaa-1111-4000-8000-000000000001';
delete from public.analysis_findings;
select throws_ok(
  $$insert into public.meals (user_id, label) values ('aaaaaaaa-0000-4000-8000-000000000001', 'fake')$$,
  '42501', null, 'B cannot insert rows as A');
select throws_ok(
  $$insert into public.meal_items (meal_id, raw_text) values ('aaaaaaaa-1111-4000-8000-000000000001', 'x')$$,
  '23503', null, 'B cannot attach items to A meal');
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id) values ('prescriptions', 'aaaaaaaa-0000-4000-8000-000000000001/eeeeeeee-0000-4000-8000-000000000001.pdf', 'bbbbbbbb-0000-4000-8000-000000000002')$$,
  '42501', null, 'B cannot upload into A folder');

-- ── anon sees nothing ──
reset role;
set local role anon;
select throws_ok($$select 1 from public.meals$$,      '42501', null, 'anon cannot read user tables');
select throws_ok($$select 1 from public.substances$$, '42501', null, 'anon cannot read catalog');

-- ── B's update/delete had no effect on A's rows ──
reset role;
select is((select label from public.meals where id = 'aaaaaaaa-1111-4000-8000-000000000001'), 'A kahvaltı', 'A meal unchanged by B');
select is((select count(*) from public.analysis_findings where user_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 1::bigint, 'A finding not deleted by B');

-- ── Account deletion cascades ──
delete from auth.users where id = 'aaaaaaaa-0000-4000-8000-000000000001';
select is((select count(*) from public.meals where user_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 0::bigint, 'deleting user removes meals');
select is((select count(*) from public.analysis_findings where user_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 0::bigint, 'deleting user removes findings');

-- ── Consent and publishing ──
insert into auth.users (id, instance_id, aud, role, email) values
  ('cccccccc-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@test.local');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok($$insert into public.meals (label) values ('no consent')$$, '42501', null, 'no health data without consent');
select throws_ok($$insert into public.user_conditions (condition_code) values ('renal')$$, '42501', null, 'no conditions without consent');
select lives_ok($$update public.profiles set health_consent_at = now(), health_consent_version = 'test' where user_id = 'cccccccc-0000-4000-8000-000000000003'$$, 'user can give consent');
select lives_ok($$insert into public.meals (label) values ('with consent')$$, 'health data allowed after consent');
reset role;

insert into public.interactions (id, substance_a, substance_b, severity, evidence_source) values
  ('dddddddd-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'high', 'TEST');
select throws_ok($$update public.interactions set status = 'published' where id = 'dddddddd-0000-4000-8000-000000000001'$$, '23514', null, 'cannot publish without reviewed_at');
set local role authenticated;
select is((select count(*) from public.interactions where id = 'dddddddd-0000-4000-8000-000000000001'), 0::bigint, 'draft interactions are hidden');
reset role;

-- ── Skipped meals and self-service deletion ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-4000-8000-000000000003","role":"authenticated"}', true);
select lives_ok($$insert into public.meals (label, skipped) values ('Kahvaltı', true)$$, 'user can mark a meal as skipped');
select is((select count(*) from public.meals where skipped), 1::bigint, 'skipped meal is stored');
reset role;
set local role anon;
select throws_ok($$select public.delete_my_account()$$, '42501', null, 'anon cannot call delete_my_account');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-4000-8000-000000000003","role":"authenticated"}', true);
select lives_ok($$select public.delete_my_account()$$, 'user can delete their own account');
reset role;
select is((select count(*) from auth.users where id = 'cccccccc-0000-4000-8000-000000000003'), 0::bigint, 'delete_my_account removes only the caller');

select * from finish();
rollback;
