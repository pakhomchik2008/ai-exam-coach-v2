-- AI Exam Coach — qualifications catalog (run FOURTH, after 01-03).
-- Plan 3.2: the exam/qualification metadata that used to be five scattered
-- hardcoded JS structures (EXAM_TYPES, SUBJECT_PRESETS, COUNTRY_TO_EXAM_TYPE,
-- SECTION_BASED, EN_MEDIUM) becomes ONE table. Adding a new exam (IELTS, TOEFL,
-- Duolingo) is then a single row here + its subject rows in `curriculum` — no
-- code change, no deploy. The bundled onboarding-data.jsx copy stays only as an
-- instant/offline snapshot (client merges DB over it, same as the catalog).

create table if not exists public.qualifications (
  id                    text primary key,          -- 'gcse','alevel','ielts'
  label                 text not null,             -- shown in the picker
  emoji                 text,
  blurb                 jsonb not null default '{}'::jsonb,  -- {en,uk,ru,fr,de}
  board                 text,                      -- default board label
  board_options         jsonb,                     -- ["AQA",...] or null (no board choice)
  education_system_id   text,                      -- 'k12' | 'higher-ed' | null
  grade_config          jsonb not null,            -- {kind, options|min/max/step/suffix, current, target}
  subject_presets       jsonb not null default '[]'::jsonb,   -- was SUBJECT_PRESETS[id]
  section_based         boolean not null default false,       -- SAT/ACT: covers all sections, no subject picker
  en_medium             boolean not null default false,       -- ask which language to explain lessons in
  default_for_countries jsonb not null default '[]'::jsonb,   -- inverse of COUNTRY_TO_EXAM_TYPE
  sort_order            int not null default 100,             -- order in the picker
  source                text not null default 'official',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Keep updated_at fresh (reuses set_updated_at() from 01_curriculum_schema.sql).
drop trigger if exists qualifications_set_updated_at on public.qualifications;
create trigger qualifications_set_updated_at
  before update on public.qualifications
  for each row execute function public.set_updated_at();

-- Public reference data: anyone may READ, nobody writes via the public API
-- (admin adds exams here in the SQL/Table editor; postgres bypasses RLS).
alter table public.qualifications enable row level security;
drop policy if exists "qualifications public read" on public.qualifications;
create policy "qualifications public read"
  on public.qualifications for select using (true);

-- ─── seed: the 11 qualifications currently hardcoded in onboarding-data.jsx ───
begin;
truncate table public.qualifications;
insert into public.qualifications (id, label, emoji, blurb, board, board_options, education_system_id, grade_config, subject_presets, section_based, en_medium, default_for_countries, sort_order) values ('gcse', 'GCSE', '🇬🇧', '{"en":"9–1 grading","uk":"Оцінки 9–1","ru":"Оценки 9–1","fr":"Notation 9–1","de":"Notenskala 9–1"}'::jsonb, 'AQA', '["AQA","Edexcel","OCR","WJEC"]'::jsonb, 'k12', '{"kind":"scale","options":["9","8","7","6","5","4","3"],"current":"6","target":"8"}'::jsonb, '["Maths","English Language","English Literature","Biology","Chemistry","Physics","History","Geography","French","Spanish","German","Computer Science","Art & Design","Music","Business Studies","Drama","Religious Studies","Physical Education","Sociology","Economics"]'::jsonb, false, true, '[]'::jsonb, 0);
insert into public.qualifications (id, label, emoji, blurb, board, board_options, education_system_id, grade_config, subject_presets, section_based, en_medium, default_for_countries, sort_order) values ('alevel', 'A-Level', '🇬🇧', '{"en":"A*–E grading","uk":"Оцінки A*–E","ru":"Оценки A*–E","fr":"Notation A*–E","de":"Notenskala A*–E"}'::jsonb, 'AQA', '["AQA","Edexcel","OCR","WJEC"]'::jsonb, 'k12', '{"kind":"scale","options":["A*","A","B","C","D","E"],"current":"B","target":"A"}'::jsonb, '["Mathematics","Further Mathematics","English Literature","Biology","Chemistry","Physics","History","Geography","French","Spanish","German","Computer Science","Art & Design","Music","Business Studies","Economics","Psychology","Sociology","Law","Film Studies","Physical Education"]'::jsonb, false, true, '["gb"]'::jsonb, 1);
insert into public.qualifications (id, label, emoji, blurb, board, board_options, education_system_id, grade_config, subject_presets, section_based, en_medium, default_for_countries, sort_order) values ('sat', 'SAT', '🇺🇸', '{"en":"400–1600","uk":"400–1600","ru":"400–1600","fr":"400–1600","de":"400–1600"}'::jsonb, 'College Board', null, 'k12', '{"kind":"score","min":400,"max":1600,"step":10,"current":1180,"target":1450}'::jsonb, '["Math","Reading & Writing"]'::jsonb, true, true, '["us"]'::jsonb, 2);
insert into public.qualifications (id, label, emoji, blurb, board, board_options, education_system_id, grade_config, subject_presets, section_based, en_medium, default_for_countries, sort_order) values ('act', 'ACT', '🇺🇸', '{"en":"Composite 1–36","uk":"Композит 1–36","ru":"Композит 1–36","fr":"Composite 1–36","de":"Gesamt 1–36"}'::jsonb, 'ACT, Inc.', null, 'k12', '{"kind":"score","min":1,"max":36,"step":1,"current":26,"target":32}'::jsonb, '["Math","English","Reading","Science"]'::jsonb, true, true, '[]'::jsonb, 3);
insert into public.qualifications (id, label, emoji, blurb, board, board_options, education_system_id, grade_config, subject_presets, section_based, en_medium, default_for_countries, sort_order) values ('ap', 'AP', '🇺🇸', '{"en":"Advanced Placement 1–5","uk":"Advanced Placement 1–5","ru":"Advanced Placement 1–5","fr":"Advanced Placement 1–5","de":"Advanced Placement 1–5"}'::jsonb, 'College Board', null, 'k12', '{"kind":"scale","options":["5","4","3","2","1"],"current":"3","target":"5"}'::jsonb, '["AP Calculus AB","AP Calculus BC","AP Statistics","AP Physics 1","AP Physics C","AP Chemistry","AP Biology","AP Environmental Science","AP US History","AP World History","AP European History","AP English Language","AP English Literature","AP Computer Science A","AP Psychology","AP Economics (Micro)","AP Economics (Macro)","AP US Government","AP Spanish","AP French"]'::jsonb, false, true, '[]'::jsonb, 4);
insert into public.qualifications (id, label, emoji, blurb, board, board_options, education_system_id, grade_config, subject_presets, section_based, en_medium, default_for_countries, sort_order) values ('ib', 'IB', '🌍', '{"en":"Diploma 1–7 / 45","uk":"Диплом 1–7 / 45","ru":"Диплом 1–7 / 45","fr":"Diplôme 1–7 / 45","de":"Diplom 1–7 / 45"}'::jsonb, 'Int. Baccalaureate', null, 'k12', '{"kind":"scale","options":["7","6","5","4","3","2"],"current":"4","target":"6"}'::jsonb, '["Mathematics AA","Mathematics AI","Physics","Chemistry","Biology","Environmental Systems","History","Geography","Economics","English A","English B","Computer Science","Visual Arts","Psychology","Philosophy"]'::jsonb, false, true, '["fr"]'::jsonb, 5);
insert into public.qualifications (id, label, emoji, blurb, board, board_options, education_system_id, grade_config, subject_presets, section_based, en_medium, default_for_countries, sort_order) values ('nmt', 'NMT', '🇺🇦', '{"en":"NMT · 100–200","uk":"НМТ · 100–200","ru":"НМТ · 100–200","fr":"NMT · 100–200","de":"NMT · 100–200"}'::jsonb, 'UCEQA', null, 'k12', '{"kind":"score","min":100,"max":200,"step":1,"current":145,"target":180}'::jsonb, '["Українська мова","Математика","Історія України","Біологія","Хімія","Фізика","Географія","Англійська мова","Іноземна мова"]'::jsonb, false, false, '["ua"]'::jsonb, 6);
insert into public.qualifications (id, label, emoji, blurb, board, board_options, education_system_id, grade_config, subject_presets, section_based, en_medium, default_for_countries, sort_order) values ('matura', 'Matura', '🇵🇱', '{"en":"0–100%","uk":"0–100%","ru":"0–100%","fr":"0–100%","de":"0–100%"}'::jsonb, 'CKE', null, 'k12', '{"kind":"score","min":0,"max":100,"step":1,"suffix":"%","current":60,"target":85}'::jsonb, '["Matematyka","Język polski","Język angielski","Biologia","Chemia","Fizyka","Historia","Geografia","Informatyka","Wiedza o społeczeństwie","Język niemiecki","Język rosyjski"]'::jsonb, false, false, '["pl"]'::jsonb, 7);
insert into public.qualifications (id, label, emoji, blurb, board, board_options, education_system_id, grade_config, subject_presets, section_based, en_medium, default_for_countries, sort_order) values ('abitur', 'Abitur', '🇩🇪', '{"en":"1.0 best → 4.0","uk":"1.0 найкраще → 4.0","ru":"1.0 лучшее → 4.0","fr":"1.0 meilleur → 4.0","de":"1,0 beste → 4,0"}'::jsonb, 'KMK', null, 'k12', '{"kind":"scale","options":["1.0","1.3","1.7","2.0","2.3","2.7","3.0"],"current":"2.3","target":"1.3"}'::jsonb, '["Mathematik","Deutsch","Englisch","Biologie","Chemie","Physik","Geschichte","Geographie","Informatik","Sozialkunde","Französisch","Kunst","Musik","Sport","Wirtschaft"]'::jsonb, false, false, '["de"]'::jsonb, 8);
insert into public.qualifications (id, label, emoji, blurb, board, board_options, education_system_id, grade_config, subject_presets, section_based, en_medium, default_for_countries, sort_order) values ('uni', 'University', '🎓', '{"en":"Degree classifications","uk":"Класифікації ступенів","ru":"Классификации степеней","fr":"Classifications de diplôme","de":"Abschlussklassen"}'::jsonb, 'Custom modules', null, 'higher-ed', '{"kind":"scale","options":["1st","2:1","2:2","3rd","Pass"],"current":"2:1","target":"1st"}'::jsonb, '["Mathematics","Physics","Chemistry","Biology","Computer Science","Economics","Psychology","History","English Literature","Philosophy","Sociology","Political Science","Law","Business Administration","Accounting","Finance","Marketing","Engineering","Medicine","Nursing","Architecture","Statistics","Linguistics","Geography","Environmental Science","Art History","Music"]'::jsonb, false, false, '[]'::jsonb, 9);
insert into public.qualifications (id, label, emoji, blurb, board, board_options, education_system_id, grade_config, subject_presets, section_based, en_medium, default_for_countries, sort_order) values ('custom', 'Custom', '✏️', '{"en":"Set your own","uk":"Налаштуйте самі","ru":"Настройте сами","fr":"Personnalisé","de":"Selbst festlegen"}'::jsonb, 'Any exam', null, null, '{"kind":"scale","options":["A","B","C","D","Pass"],"current":"C","target":"A"}'::jsonb, '[]'::jsonb, false, false, '["other"]'::jsonb, 10);
commit;
