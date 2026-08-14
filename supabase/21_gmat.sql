-- AI Exam Coach — GMAT Focus (run TWENTY-FIRST).
--
-- Bundled snapshot already has the exam (onboarding-data.jsx + curriculum-data.jsx).
-- This row is what qualifications-store merges over that snapshot.
-- Focus Edition: 205–805. Do NOT steal the US default from SAT.
-- Do NOT treat this as classic 200–800.

begin;

insert into public.qualifications (
  id, label, emoji, blurb, board, board_options, education_system_id,
  grade_config, subject_presets, section_based, en_medium,
  default_for_countries, sort_order
) values (
  'gmat',
  'GMAT',
  '💼',
  '{"en":"Focus 205–805","uk":"Focus 205–805","ru":"Focus 205–805","fr":"Focus 205–805","de":"Focus 205–805"}'::jsonb,
  'GMAC',
  null,
  'higher-ed',
  '{"kind":"score","min":205,"max":805,"step":10,"current":555,"target":655}'::jsonb,
  '["Quantitative Reasoning","Verbal Reasoning","Data Insights"]'::jsonb,
  true,
  true,
  '[]'::jsonb,
  24
)
on conflict (id) do update set
  label = excluded.label,
  emoji = excluded.emoji,
  blurb = excluded.blurb,
  board = excluded.board,
  education_system_id = excluded.education_system_id,
  grade_config = excluded.grade_config,
  subject_presets = excluded.subject_presets,
  section_based = excluded.section_based,
  en_medium = excluded.en_medium,
  default_for_countries = excluded.default_for_countries,
  sort_order = excluded.sort_order,
  updated_at = now();

commit;

-- verification
-- select id, label, section_based, en_medium, default_for_countries, grade_config
--   from public.qualifications where id in ('gmat','gre','sat');
-- -- gmat.default_for_countries should be []; sat should still be {us}.
-- -- gmat.grade_config.min should be 205, not 200.
