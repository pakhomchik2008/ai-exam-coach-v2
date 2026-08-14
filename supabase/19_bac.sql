-- AI Exam Coach — Baccalauréat général (run NINETEENTH).
--
-- Bundled snapshot already has the exam (onboarding-data.jsx + curriculum-data.jsx).
-- This row is what qualifications-store merges over that snapshot, and it
-- steals France's default exam from IB (04 seeded IB as default_for_countries
-- = fr, which was a placeholder).
--
-- Curriculum topic lists stay in the client seed (same as Abitur): the
-- `curriculum` table is additive here so a cold DB still serves official
-- rows after Hlib runs this. Client degrades without the table? No — the
-- table exists from 01. Missing *rows* just means the bundled seed wins.

begin;

-- IB is international, not the French lycée exam.
update public.qualifications
   set default_for_countries = '[]'::jsonb
 where id = 'ib'
   and default_for_countries @> '["fr"]'::jsonb;

insert into public.qualifications (
  id, label, emoji, blurb, board, board_options, education_system_id,
  grade_config, subject_presets, section_based, en_medium,
  default_for_countries, sort_order
) values (
  'bac',
  'Bac',
  '🇫🇷',
  '{"en":"0–20 · mentions","uk":"0–20 · mentions","ru":"0–20 · mentions","fr":"0–20 · mentions","de":"0–20 · Mentions"}'::jsonb,
  'Éducation nationale',
  null,
  'k12',
  '{"kind":"score","min":0,"max":20,"step":0.5,"current":12,"target":16}'::jsonb,
  '["Français","Philosophie","Grand oral","Mathématiques","Physique-Chimie","SVT","SES","NSI","HGGSP","HLP","LLCER Anglais"]'::jsonb,
  false,
  false,
  '["fr"]'::jsonb,
  8
)
on conflict (id) do update set
  label = excluded.label,
  emoji = excluded.emoji,
  blurb = excluded.blurb,
  board = excluded.board,
  grade_config = excluded.grade_config,
  subject_presets = excluded.subject_presets,
  default_for_countries = excluded.default_for_countries,
  sort_order = excluded.sort_order,
  updated_at = now();

commit;

-- verification
-- select id, label, default_for_countries
--   from public.qualifications where id in ('bac','ib');
-- -- bac.default_for_countries should be {fr}; ib should not contain fr.
