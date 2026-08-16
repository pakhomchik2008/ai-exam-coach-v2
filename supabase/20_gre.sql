-- Examik — GRE General (run TWENTIETH).
--
-- Bundled snapshot already has the exam (onboarding-data.jsx + curriculum-data.jsx).
-- This row is what qualifications-store merges over that snapshot.
-- Shorter GRE (Sept 2023+): V+Q 260–340. Do NOT steal the US default from SAT.

begin;

insert into public.qualifications (
  id, label, emoji, blurb, board, board_options, education_system_id,
  grade_config, subject_presets, section_based, en_medium,
  default_for_countries, sort_order
) values (
  'gre',
  'GRE',
  '🇺🇸',
  '{"en":"V+Q 260–340","uk":"V+Q 260–340","ru":"V+Q 260–340","fr":"V+Q 260–340","de":"V+Q 260–340"}'::jsonb,
  'ETS',
  null,
  'higher-ed',
  '{"kind":"score","min":260,"max":340,"step":1,"current":305,"target":320}'::jsonb,
  '["Verbal Reasoning","Quantitative Reasoning","Analytical Writing"]'::jsonb,
  true,
  true,
  '[]'::jsonb,
  23
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
--   from public.qualifications where id in ('gre','sat');
-- -- gre.default_for_countries should be []; sat should still be {us}.
