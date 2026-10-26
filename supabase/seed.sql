-- ⚠️ DEVELOPMENT ONLY. Not clinical data.
-- Every interaction / limit below is a placeholder so the app and the Faz 2 scenario can run.
-- Severities, amounts and limits are NOT validated. Real entries must come from a cited,
-- clinically reviewed source before production (see Faz 6).

-- Fixed ids so tests and fixtures can refer to them.
insert into public.substances (id, name, synonyms, kind) values
  ('10000000-0000-4000-8000-000000000001', 'Varfarin',      '{warfarin}',              'active_ingredient'),
  ('10000000-0000-4000-8000-000000000002', 'Atorvastatin',  '{atorvastatin}',          'active_ingredient'),
  ('10000000-0000-4000-8000-000000000003', 'K vitamini',    '{"vitamin K",fillokinon}', 'nutrient'),
  ('10000000-0000-4000-8000-000000000004', 'Furanokumarin', '{furanocoumarin}',        'compound'),
  ('10000000-0000-4000-8000-000000000005', 'Kalsiyum',      '{calcium,Ca}',            'nutrient'),
  ('10000000-0000-4000-8000-000000000006', 'Demir',         '{iron,Fe}',               'nutrient'),
  ('10000000-0000-4000-8000-000000000007', 'Potasyum',      '{potassium,K}',           'nutrient'),
  ('10000000-0000-4000-8000-000000000008', 'Laktoz',        '{lactose}',               'compound');

insert into public.products (id, kind, name, barcode, brand, source) values
  ('20000000-0000-4000-8000-000000000001', 'drug',       'Varfarin 5 mg tablet',     null,            'ÖRNEK', 'seed'),
  ('20000000-0000-4000-8000-000000000002', 'drug',       'Atorvastatin 20 mg tablet', null,           'ÖRNEK', 'seed'),
  ('20000000-0000-4000-8000-000000000003', 'food',       'Ispanak',                  null,            null,    'seed'),
  ('20000000-0000-4000-8000-000000000004', 'food',       'Greyfurt suyu',            '0000000000017', 'ÖRNEK', 'seed'),
  ('20000000-0000-4000-8000-000000000005', 'food',       'Süt',                      '0000000000024', 'ÖRNEK', 'seed'),
  ('20000000-0000-4000-8000-000000000006', 'supplement', 'Demir takviyesi',          '0000000000031', 'ÖRNEK', 'seed'),
  ('20000000-0000-4000-8000-000000000007', 'food',       'Muz',                      null,            null,    'seed');

-- Amounts left null on purpose: no invented nutrient values.
insert into public.product_substances (product_id, substance_id, amount, unit) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', null, null),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', null, null),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', null, null),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', null, null),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', null, null),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000008', null, null),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000006', null, null),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000007', null, null);

-- Pairs match the Faz 2 test scenario. Text is placeholder, not advice.
insert into public.interactions
  (id, substance_a, substance_b, severity, condition_code, mechanism, advice, evidence_source, reviewed_at)
values
  ('30000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002',
   'high', null,
   'ÖRNEK kayıt – mekanizma klinik kaynaktan girilecek.',
   'ÖRNEK kayıt – öneri klinik kaynaktan girilecek.',
   'ÖRNEK – klinik doğrulama gerekli', null),
  ('30000000-0000-4000-8000-000000000002',
   '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001',
   'caution', null,
   'ÖRNEK kayıt – mekanizma klinik kaynaktan girilecek.',
   'ÖRNEK kayıt – öneri klinik kaynaktan girilecek.',
   'ÖRNEK – klinik doğrulama gerekli', null),
  ('30000000-0000-4000-8000-000000000003',
   '10000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000006',
   'info', null,
   'ÖRNEK kayıt – mekanizma klinik kaynaktan girilecek.',
   'ÖRNEK kayıt – öneri klinik kaynaktan girilecek.',
   'ÖRNEK – klinik doğrulama gerekli', null),
  -- Condition-specific row for the same pair: drives requiresAlert in the cardiology scenario.
  ('30000000-0000-4000-8000-000000000004',
   '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002',
   'contraindicated', 'cardiology',
   'ÖRNEK kayıt – mekanizma klinik kaynaktan girilecek.',
   'ÖRNEK kayıt – öneri klinik kaynaktan girilecek.',
   'ÖRNEK – klinik doğrulama gerekli', null);

-- Placeholder limit (value is arbitrary, only for exercising DoseLimitHandler in development).
insert into public.nutrient_limits (substance_id, condition_code, upper_limit, unit, period, source) values
  ('10000000-0000-4000-8000-000000000007', 'renal', 1, 'g', 'day', 'ÖRNEK – klinik doğrulama gerekli');

insert into public.allergens (id, name, cross_reactive_substances) values
  ('40000000-0000-4000-8000-000000000001', 'Süt / laktoz', '{10000000-0000-4000-8000-000000000008}');
