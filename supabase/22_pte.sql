-- Examik — PTE Academic (run TWENTY-SECOND).
--
-- Bundled snapshot already has the exam (onboarding-data.jsx + curriculum-data.jsx).
-- This row is what qualifications-store merges over that snapshot.
-- 10–90 overall + skills. Do NOT steal any country's default exam.
-- This is Academic, not Core / Home / a separate UKVI row.

begin;

insert into public.qualifications (
  id, label, emoji, blurb, board, board_options, education_system_id,
  grade_config, subject_presets, section_based, en_medium,
  default_for_countries, sort_order
) values (
  'pte',
  'PTE',
  '🌐',
  '{"en":"10–90","uk":"10–90","ru":"10–90","fr":"10–90","de":"10–90"}'::jsonb,
  'Pearson',
  null,
  'language',
  '{"kind":"score","min":10,"max":90,"step":1,"current":50,"target":65}'::jsonb,
  '["Speaking","Writing","Reading","Listening"]'::jsonb,
  true,
  false,
  '[]'::jsonb,
  25
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
--   from public.qualifications where id in ('pte','ielts','toefl');
-- -- pte.default_for_countries should be [].
-- -- pte.grade_config min/max 10/90; section_based true.
