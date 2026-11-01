-- NutriDose starter catalog (production). Applied with the service role; idempotent (safe to re-run).
--
-- Scope: well-documented drug–food interactions for drugs commonly used in Turkey. Every interaction
-- cites the official label (US prescribing information / package leaflet) or an NIH fact sheet it
-- was summarised from. Nutrient amounts are left NULL on purpose: no invented values.
--
-- ⚠️ Summarised by the NutriDose team from the cited sources; a pharmacist or physician must review
-- every row before the app is used for real patients. The app always shows "tıbbi tavsiye yerine geçmez".
--
-- Brand names are examples of products sold in Turkey containing the active ingredient; matching is
-- done on the active ingredient, so any brand of the same ingredient behaves the same.

begin;

-- ── Substances ───────────────────────────────────────────
insert into public.substances (name, synonyms, kind) values
  ('Varfarin',        '{warfarin}',                                   'active_ingredient'),
  ('Atorvastatin',    '{atorvastatin}',                               'active_ingredient'),
  ('Simvastatin',     '{simvastatin}',                                'active_ingredient'),
  ('Nifedipin',       '{nifedipine}',                                 'active_ingredient'),
  ('Siklosporin',     '{siklosporin,cyclosporine,ciclosporin}',       'active_ingredient'),
  ('Takrolimus',      '{tacrolimus}',                                 'active_ingredient'),
  ('Levotiroksin',    '{levothyroxine,"l-tiroksin",tiroksin}',        'active_ingredient'),
  ('Siprofloksasin',  '{ciprofloxacin,cipro}',                        'active_ingredient'),
  ('Doksisiklin',     '{doxycycline}',                                'active_ingredient'),
  ('Linezolid',       '{linezolid}',                                  'active_ingredient'),
  ('Moklobemid',      '{moclobemide}',                                'active_ingredient'),
  ('Ramipril',        '{ramipril}',                                   'active_ingredient'),
  ('Enalapril',       '{enalapril}',                                  'active_ingredient'),
  ('Losartan',        '{losartan}',                                   'active_ingredient'),
  ('Spironolakton',   '{spironolactone}',                             'active_ingredient'),
  ('Metformin',       '{metformin}',                                  'active_ingredient'),
  ('Gliklazid',       '{gliclazide}',                                 'active_ingredient'),
  ('İnsülin',         '{insulin}',                            'active_ingredient'),
  ('Metronidazol',    '{metronidazole}',                              'active_ingredient'),
  ('Parasetamol',     '{paracetamol,asetaminofen,acetaminophen}',     'active_ingredient'),
  ('Alendronat',      '{alendronate,"alendronik asit"}',              'active_ingredient'),
  ('Metotreksat',     '{methotrexate}',                               'active_ingredient'),
  ('Teofilin',        '{theophylline}',                               'active_ingredient'),
  ('K vitamini',      '{"vitamin K",fillokinon,phylloquinone}',       'nutrient'),
  ('Furanokumarin',   '{furanocoumarin,greyfurt}',                    'compound'),
  ('Kalsiyum',        '{calcium}',                                    'nutrient'),
  ('Demir',           '{iron}',                                       'nutrient'),
  ('Potasyum',        '{potassium}',                                  'nutrient'),
  ('Tiramin',         '{tyramine}',                                   'compound'),
  ('Alkol',           '{etanol,ethanol,alcohol}',                     'compound'),
  ('Kafein',          '{caffeine}',                                   'compound'),
  ('Kızılcık',        '{cranberry}',                                  'compound'),
  ('Soya',            '{soy,"soya proteini"}',                        'compound'),
  ('Tanen',           '{tannin,polifenol}',                           'compound'),
  ('Laktoz',          '{lactose}',                                    'compound'),
  ('Gluten',          '{gluten}',                                     'compound'),
  ('Yumurta proteini','{"egg protein"}',                              'compound'),
  ('Yer fıstığı proteini','{"peanut protein"}',                       'compound')
on conflict (name) do update set synonyms = excluded.synonyms;

-- ── Products ─────────────────────────────────────────────
create temp table _products (name text, kind public.product_kind, brand text, subs text[]) on commit drop;
insert into _products values
  -- Drugs (brand (etken madde))
  ('Coumadin (varfarin)',            'drug', 'Coumadin',      '{Varfarin}'),
  ('Ator (atorvastatin)',            'drug', 'Ator',          '{Atorvastatin}'),
  ('Lipitor (atorvastatin)',         'drug', 'Lipitor',       '{Atorvastatin}'),
  ('Zocor (simvastatin)',            'drug', 'Zocor',         '{Simvastatin}'),
  ('Nidilat (nifedipin)',            'drug', 'Nidilat',       '{Nifedipin}'),
  ('Sandimmun Neoral (siklosporin)', 'drug', 'Sandimmun',     '{Siklosporin}'),
  ('Prograf (takrolimus)',           'drug', 'Prograf',       '{Takrolimus}'),
  ('Euthyrox (levotiroksin)',        'drug', 'Euthyrox',      '{Levotiroksin}'),
  ('Levotiron (levotiroksin)',       'drug', 'Levotiron',     '{Levotiroksin}'),
  ('Cipro (siprofloksasin)',         'drug', 'Cipro',         '{Siprofloksasin}'),
  ('Siprosan (siprofloksasin)',      'drug', 'Siprosan',      '{Siprofloksasin}'),
  ('Tetradox (doksisiklin)',         'drug', 'Tetradox',      '{Doksisiklin}'),
  ('Zyvox (linezolid)',              'drug', 'Zyvox',         '{Linezolid}'),
  ('Aurorix (moklobemid)',           'drug', 'Aurorix',       '{Moklobemid}'),
  ('Delix (ramipril)',               'drug', 'Delix',         '{Ramipril}'),
  ('Konveril (enalapril)',           'drug', 'Konveril',      '{Enalapril}'),
  ('Cozaar (losartan)',              'drug', 'Cozaar',        '{Losartan}'),
  ('Aldactone (spironolakton)',      'drug', 'Aldactone',     '{Spironolakton}'),
  ('Glifor (metformin)',             'drug', 'Glifor',        '{Metformin}'),
  ('Glucophage (metformin)',         'drug', 'Glucophage',    '{Metformin}'),
  ('Diamicron MR (gliklazid)',       'drug', 'Diamicron',     '{Gliklazid}'),
  ('Lantus (insülin glarjin)',       'drug', 'Lantus',        '{İnsülin}'),
  ('NovoRapid (insülin aspart)',     'drug', 'NovoRapid',     '{İnsülin}'),
  ('Humalog (insülin lispro)',       'drug', 'Humalog',       '{İnsülin}'),
  ('Flagyl (metronidazol)',          'drug', 'Flagyl',        '{Metronidazol}'),
  ('Parol (parasetamol)',            'drug', 'Parol',         '{Parasetamol}'),
  ('Minoset (parasetamol)',          'drug', 'Minoset',       '{Parasetamol}'),
  ('Fosamax (alendronat)',           'drug', 'Fosamax',       '{Alendronat}'),
  ('Metotreksat tablet',             'drug', null,            '{Metotreksat}'),
  ('Teokap (teofilin)',              'drug', 'Teokap',        '{Teofilin}'),
  -- Supplements
  ('Ferro Sanol (demir)',            'supplement', 'Ferro Sanol', '{Demir}'),
  ('Demir takviyesi',                'supplement', null,      '{Demir}'),
  ('Kalsiyum takviyesi',             'supplement', null,      '{Kalsiyum}'),
  -- Foods and drinks
  ('Ispanak',                        'food', null, '{"K vitamini"}'),
  ('Karalahana',                     'food', null, '{"K vitamini"}'),
  ('Brokoli',                        'food', null, '{"K vitamini"}'),
  ('Roka',                           'food', null, '{"K vitamini"}'),
  ('Maydanoz',                       'food', null, '{"K vitamini"}'),
  ('Semizotu',                       'food', null, '{"K vitamini"}'),
  ('Greyfurt',                       'food', null, '{Furanokumarin}'),
  ('Greyfurt suyu',                  'food', null, '{Furanokumarin}'),
  ('Süt',                            'food', null, '{Kalsiyum,Laktoz}'),
  ('Yoğurt',                         'food', null, '{Kalsiyum,Laktoz}'),
  ('Ayran',                          'food', null, '{Kalsiyum,Laktoz}'),
  ('Beyaz peynir',                   'food', null, '{Kalsiyum,Laktoz}'),
  ('Kaşar peyniri',                  'food', null, '{Kalsiyum}'),
  ('Eski kaşar',                     'food', null, '{Kalsiyum,Tiramin}'),
  ('Tulum peyniri',                  'food', null, '{Kalsiyum,Tiramin}'),
  ('Sucuk',                          'food', null, '{Tiramin}'),
  ('Pastırma',                       'food', null, '{Tiramin}'),
  ('Salam',                          'food', null, '{Tiramin}'),
  ('Soya sosu',                      'food', null, '{Tiramin,Soya}'),
  ('Soya sütü',                      'food', null, '{Soya}'),
  ('Muz',                            'food', null, '{Potasyum}'),
  ('Kuru kayısı',                    'food', null, '{Potasyum}'),
  ('Portakal suyu',                  'food', null, '{Potasyum}'),
  ('Patates',                        'food', null, '{Potasyum}'),
  ('Avokado',                        'food', null, '{Potasyum}'),
  ('Az sodyumlu tuz (potasyumlu)',   'food', null, '{Potasyum}'),
  ('Kahve',                          'food', null, '{Kafein,Tanen}'),
  ('Türk kahvesi',                   'food', null, '{Kafein,Tanen}'),
  ('Çay',                            'food', null, '{Kafein,Tanen}'),
  ('Kola',                           'food', null, '{Kafein}'),
  ('Enerji içeceği',                 'food', null, '{Kafein}'),
  ('Bira',                           'food', null, '{Alkol}'),
  ('Şarap',                          'food', null, '{Alkol}'),
  ('Rakı',                           'food', null, '{Alkol}'),
  ('Kızılcık suyu',                  'food', null, '{Kızılcık}'),
  ('Poğaça',                         'food', null, '{Gluten,Laktoz,"Yumurta proteini"}'),
  ('Simit',                          'food', null, '{Gluten}'),
  ('Ekmek',                          'food', null, '{Gluten}'),
  ('Yumurta',                        'food', null, '{"Yumurta proteini"}'),
  ('Yer fıstığı',                    'food', null, '{"Yer fıstığı proteini"}');

insert into public.products (kind, name, brand, source)
select p.kind, p.name, p.brand, 'NutriDose başlangıç kataloğu (2026-11)'
from _products p
where not exists (select 1 from public.products x where x.name = p.name);

insert into public.product_substances (product_id, substance_id)
select x.id, s.id
from _products p
join public.products x on x.name = p.name
cross join lateral unnest(p.subs) as u(substance_name)
join public.substances s on s.name = u.substance_name
on conflict do nothing;

-- ── Interactions ─────────────────────────────────────────
create temp table _ix (a text, b text, severity public.severity, condition_code text, mechanism text, advice text, source text) on commit drop;
insert into _ix values
  ('Varfarin', 'K vitamini', 'caution', null,
   'K vitamini varfarinin etkisine karşı çalışır; yeşil yapraklı sebze miktarındaki ani değişiklikler INR değerini değiştirir.',
   'Yeşil yapraklı sebzeleri bırakmayın; her gün benzer miktarda yiyin ve ani değişiklik yapmayın. INR kontrollerinizi aksatmayın.',
   'COUMADIN (warfarin) ABD prospektüsü, Bölüm 17 (Hasta danışmanlığı – diyet); NIH ODS Vitamin K bilgi formu'),
  ('Varfarin', 'Kızılcık', 'caution', null,
   'Kızılcık ürünleriyle birlikte INR yükselmesi ve kanama bildirilmiştir.',
   'Büyük miktarda kızılcık suyu içmeyin; düzenli tüketecekseniz doktorunuza söyleyin.',
   'COUMADIN (warfarin) ABD prospektüsü, Bölüm 7 (Botanik ürünler – kızılcık)'),
  ('Varfarin', 'Alkol', 'caution', null,
   'Alkol INR değerini öngörülemeyen şekilde değiştirebilir ve kanama riskini artırır.',
   'Alkolden kaçının ya da miktarı az ve düzenli tutun; değişiklikleri doktorunuza söyleyin.',
   'COUMADIN (warfarin) ABD prospektüsü, Bölüm 17 (Hasta danışmanlığı)'),
  ('Simvastatin', 'Furanokumarin', 'high', null,
   'Greyfurt, simvastatini parçalayan CYP3A4 enzimini baskılar; kan düzeyi ve kas hasarı (miyopati) riski artar.',
   'Simvastatin kullanırken greyfurt ve greyfurt suyu tüketmeyin.',
   'ZOCOR (simvastatin) ABD prospektüsü, Bölüm 5.1 ve 7'),
  ('Atorvastatin', 'Furanokumarin', 'caution', null,
   'Çok miktarda greyfurt suyu atorvastatin kan düzeyini artırabilir.',
   'Günde 1,2 litreden fazla greyfurt suyu içmeyin; düzenli tüketimi doktorunuza danışın.',
   'LIPITOR (atorvastatin) ABD prospektüsü, Bölüm 7'),
  ('Nifedipin', 'Furanokumarin', 'caution', null,
   'Greyfurt nifedipin kan düzeyini artırır; tansiyon düşmesi, baş dönmesi ve çarpıntı görülebilir.',
   'Nifedipin kullanırken greyfurt ve greyfurt suyundan kaçının.',
   'PROCARDIA XL (nifedipine) ABD prospektüsü, Bölüm 7'),
  ('Siklosporin', 'Furanokumarin', 'high', null,
   'Greyfurt siklosporin kan düzeyini artırır; böbrek hasarı ve yan etki riski yükselir.',
   'Greyfurt ve greyfurt suyu tüketmeyin.',
   'NEORAL (cyclosporine) ABD prospektüsü, İlaç etkileşimleri (greyfurt)'),
  ('Takrolimus', 'Furanokumarin', 'high', null,
   'Greyfurt takrolimus kan düzeyini artırır; böbrek hasarı ve nörolojik yan etki riski yükselir.',
   'Greyfurt ve greyfurt suyu tüketmeyin.',
   'PROGRAF (tacrolimus) ABD prospektüsü, Bölüm 7 (greyfurt suyu)'),
  ('Levotiroksin', 'Kalsiyum', 'caution', null,
   'Kalsiyum bağırsakta levotiroksine bağlanarak emilimini azaltır.',
   'İlacı aç karnına, kahvaltıdan 30–60 dakika önce suyla alın; süt ürünleri ve kalsiyum takviyesini en az 4 saat arayla tüketin.',
   'SYNTHROID (levothyroxine) ABD prospektüsü, Bölüm 2 ve 7'),
  ('Levotiroksin', 'Soya', 'caution', null,
   'Soya ürünleri levotiroksin emilimini azaltabilir.',
   'Soya ürünlerini ilaçtan ayrı zamanda tüketin; düzenli tüketiyorsanız tiroid testlerinizin takibi için doktorunuza söyleyin.',
   'SYNTHROID (levothyroxine) ABD prospektüsü, Bölüm 7 (gıdalar – soya unu)'),
  ('Siprofloksasin', 'Kalsiyum', 'caution', null,
   'Kalsiyum siprofloksasine bağlanarak emilimini azaltır.',
   'Siprofloksasini yalnızca süt veya yoğurtla birlikte almayın (bir öğünün parçası olabilir). Kalsiyum takviyesini ilaçtan 2 saat önce veya 6 saat sonra alın.',
   'CIPRO (ciprofloxacin) ABD prospektüsü, Bölüm 2 ve 7'),
  ('Siprofloksasin', 'Kafein', 'caution', null,
   'Siprofloksasin kafeinin vücuttan atılmasını yavaşlatır.',
   'Kahve, çay, kola ve enerji içeceklerini azaltın; çarpıntı veya uykusuzluk olursa doktorunuza söyleyin.',
   'CIPRO (ciprofloxacin) ABD prospektüsü, Bölüm 7 (kafein)'),
  ('Doksisiklin', 'Demir', 'caution', null,
   'Demir doksisiklinin emilimini azaltır.',
   'Demir takviyesini doksisiklinden ayrı zamanda alın; aralığı doktorunuza veya eczacınıza sorun.',
   'VIBRAMYCIN (doxycycline) ABD prospektüsü, İlaç etkileşimleri'),
  ('Linezolid', 'Tiramin', 'high', null,
   'Linezolid zayıf bir MAO inhibitörüdür; tiraminden zengin yiyecekler ani tansiyon yükselmesine yol açabilir.',
   'Eski kaşar, tulum peyniri, sucuk, pastırma, soya sosu gibi tiraminden zengin yiyecekleri büyük miktarda tüketmeyin.',
   'ZYVOX (linezolid) ABD prospektüsü, Bölüm 5 ve 7 (tiramin)'),
  ('Moklobemid', 'Tiramin', 'caution', null,
   'Moklobemid MAO-A enzimini baskılar; çok miktarda tiramin tansiyonu yükseltebilir.',
   'Tiraminden zengin yiyecekleri (eski peynirler, kürlenmiş etler, soya sosu) büyük miktarda tüketmeyin.',
   'Moklobemid Kısa Ürün Bilgisi (KÜB), Bölüm 4.5'),
  ('Ramipril', 'Potasyum', 'caution', null,
   'ACE inhibitörleri kandaki potasyumu yükseltebilir; potasyum takviyesi ve potasyumlu tuz bu riski artırır.',
   'Potasyum takviyesi ve potasyumlu "az sodyumlu tuz" kullanmadan önce doktorunuza danışın; kan potasyumunuz kontrol edilmeli.',
   'ALTACE (ramipril) ABD prospektüsü, Bölüm 5 ve 7 (potasyum)'),
  ('Ramipril', 'Potasyum', 'high', 'renal',
   'Böbrek hastalığında ACE inhibitörü ile potasyum yüksekliği (hiperkalemi) riski belirgin artar.',
   'Potasyumdan zengin yiyecek ve takviyeleri doktorunuzun önerdiği sınırda tutun; potasyumlu tuz kullanmayın.',
   'ALTACE (ramipril) ABD prospektüsü, Bölüm 5 (hiperkalemi – böbrek yetmezliği)'),
  ('Enalapril', 'Potasyum', 'caution', null,
   'ACE inhibitörleri kandaki potasyumu yükseltebilir; potasyum takviyesi ve potasyumlu tuz bu riski artırır.',
   'Potasyum takviyesi ve potasyumlu "az sodyumlu tuz" kullanmadan önce doktorunuza danışın; kan potasyumunuz kontrol edilmeli.',
   'VASOTEC (enalapril) ABD prospektüsü, Uyarılar ve İlaç etkileşimleri (potasyum)'),
  ('Enalapril', 'Potasyum', 'high', 'renal',
   'Böbrek hastalığında ACE inhibitörü ile potasyum yüksekliği (hiperkalemi) riski belirgin artar.',
   'Potasyumdan zengin yiyecek ve takviyeleri doktorunuzun önerdiği sınırda tutun; potasyumlu tuz kullanmayın.',
   'VASOTEC (enalapril) ABD prospektüsü, Uyarılar (hiperkalemi – böbrek yetmezliği)'),
  ('Losartan', 'Potasyum', 'caution', null,
   'Losartan kandaki potasyumu yükseltebilir; potasyum takviyesi ve potasyumlu tuz bu riski artırır.',
   'Potasyum takviyesi ve potasyumlu "az sodyumlu tuz" kullanmadan önce doktorunuza danışın.',
   'COZAAR (losartan) ABD prospektüsü, Bölüm 5 ve 7 (potasyum)'),
  ('Losartan', 'Potasyum', 'high', 'renal',
   'Böbrek hastalığında losartan ile potasyum yüksekliği riski belirgin artar.',
   'Potasyumdan zengin yiyecek ve takviyeleri doktorunuzun önerdiği sınırda tutun; potasyumlu tuz kullanmayın.',
   'COZAAR (losartan) ABD prospektüsü, Bölüm 5 (hiperkalemi)'),
  ('Spironolakton', 'Potasyum', 'high', null,
   'Spironolakton potasyum tutucu bir idrar söktürücüdür; ek potasyum ciddi potasyum yüksekliğine yol açabilir.',
   'Potasyum takviyesi ve potasyumlu tuz kullanmayın; potasyumdan çok zengin yiyecekleri aşırı tüketmeyin.',
   'ALDACTONE (spironolactone) ABD prospektüsü, Bölüm 5.1 ve 7 (hiperkalemi)'),
  ('Metformin', 'Alkol', 'caution', null,
   'Aşırı alkol metformin ile laktik asidoz riskini artırır.',
   'Alkolü sınırlayın; aşırı veya bir defada çok miktarda içmeyin.',
   'GLUCOPHAGE (metformin) ABD prospektüsü, Bölüm 5.1 (laktik asidoz – alkol)'),
  ('Gliklazid', 'Alkol', 'caution', null,
   'Alkol gliklazid ile kan şekerinin aşırı düşmesine (hipoglisemi) yol açabilir.',
   'Alkolden kaçının; içecekseniz aç karnına içmeyin ve kan şekerinizi izleyin.',
   'Diamicron MR Kısa Ürün Bilgisi (KÜB), Bölüm 4.4 ve 4.5'),
  ('İnsülin', 'Alkol', 'caution', null,
   'Alkol kan şekerini düşürebilir veya düşük şeker belirtilerini maskeleyebilir.',
   'Alkolü sınırlayın, aç karnına içmeyin ve kan şekerinizi daha sık ölçün.',
   'LANTUS (insulin glargine) ABD prospektüsü, Bölüm 7 (alkol)'),
  ('İnsülin', 'Alkol', 'high', 'diabetes_insulin',
   'İnsülin tedavisinde alkol ciddi ve gecikmeli hipoglisemiye yol açabilir.',
   'Alkolden kaçının; içecekseniz mutlaka yemekle birlikte için ve gece kan şekerinizi kontrol edin.',
   'LANTUS (insulin glargine) ABD prospektüsü, Bölüm 5 ve 7 (hipoglisemi – alkol)'),
  ('Metronidazol', 'Alkol', 'contraindicated', null,
   'Disülfiram benzeri reaksiyon: bulantı, kusma, yüz kızarması, baş ağrısı ve çarpıntı.',
   'Tedavi süresince ve bittikten sonra en az 3 gün alkol almayın (alkol içeren şurup ve gargaralar dahil).',
   'FLAGYL (metronidazole) ABD prospektüsü, Kontrendikasyonlar ve Bölüm 7'),
  ('Parasetamol', 'Alkol', 'caution', null,
   'Düzenli ve fazla alkol parasetamolün karaciğere zarar verme riskini artırır.',
   'Günde 3 veya daha fazla alkollü içki içiyorsanız parasetamol kullanmadan önce doktorunuza danışın; günlük dozu aşmayın.',
   'FDA reçetesiz asetaminofen etiketi (Drug Facts – karaciğer uyarısı)'),
  ('Alendronat', 'Kalsiyum', 'caution', null,
   'Yiyecek, içecek ve özellikle kalsiyum alendronat emilimini belirgin azaltır.',
   'Sabah aç karnına, yalnızca bir bardak sade suyla için; en az 30 dakika hiçbir şey yiyip içmeyin ve uzanmayın.',
   'FOSAMAX (alendronate) ABD prospektüsü, Bölüm 2 ve 7'),
  ('Alendronat', 'Kafein', 'caution', null,
   'Kahve ve çay alendronat emilimini azaltır.',
   'Alendronatı sade suyla için; kahve veya çayı en az 30 dakika sonra için.',
   'FOSAMAX (alendronate) ABD prospektüsü, Bölüm 2 (sade su dışındaki içecekler)'),
  ('Metotreksat', 'Alkol', 'high', null,
   'Alkol metotreksatın karaciğere zarar verme riskini artırır.',
   'Metotreksat kullanırken alkol almayın.',
   'Metotreksat ABD prospektüsü, Uyarılar (hepatotoksisite – alkol)'),
  ('Teofilin', 'Kafein', 'caution', null,
   'Kafein ve teofilin benzer etkilidir; birlikte çarpıntı, huzursuzluk ve bulantı artabilir.',
   'Kahve, çay, kola ve enerji içeceklerini azaltın.',
   'THEO-24 (theophylline) ABD prospektüsü, Bölüm 7 (kafein)'),
  ('Demir', 'Kalsiyum', 'info', null,
   'Kalsiyum demirin emilimini azaltır.',
   'Demir takviyesini süt ürünleri ve kalsiyum takviyesinden en az 2 saat ayrı alın.',
   'NIH ODS Iron bilgi formu (Etkileşimler)'),
  ('Demir', 'Tanen', 'info', null,
   'Çay ve kahvedeki polifenoller demirin emilimini azaltır.',
   'Demir takviyesini çay veya kahveden en az 1 saat ayrı alın.',
   'NIH ODS Iron bilgi formu (Emilimi etkileyen etkenler)');

insert into public.interactions
  (substance_a, substance_b, severity, condition_code, mechanism, advice, evidence_source, reviewed_at, status)
select sa.id, sb.id, i.severity, i.condition_code, i.mechanism, i.advice,
       i.source || ' — NutriDose ekibince özetlendi; uzman onayı bekliyor',
       date '2026-11-01', 'published'
from _ix i
join public.substances sa on sa.name = i.a
join public.substances sb on sb.name = i.b
on conflict do nothing;

-- ── Allergens ────────────────────────────────────────────
insert into public.allergens (name, cross_reactive_substances)
select v.name, array(select s.id from public.substances s where s.name = any (v.subs))
from (values
  ('Süt / laktoz', array['Laktoz']),
  ('Gluten',       array['Gluten']),
  ('Yumurta',      array['Yumurta proteini']),
  ('Yer fıstığı',  array['Yer fıstığı proteini']),
  ('Soya',         array['Soya'])
) as v(name, subs)
on conflict (name) do update set cross_reactive_substances = excluded.cross_reactive_substances;

commit;
