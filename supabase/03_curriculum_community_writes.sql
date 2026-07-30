-- AI Exam Coach — curriculum catalog: community auto-population (run THIRD).
--
-- Plan 2.2: the "long tail" of subjects nobody seeded (e.g. AP Music Theory) is
-- generated once by the first student who asks for it and then SAVED BACK to the
-- catalog so every later student loads it instantly — the catalog grows itself.
--
-- Two things are needed for that, both here:
--   1. a de-dup key so the same subject is only stored once, and
--   2. an INSERT policy — but a tightly scoped one, because this table is public
--      reference data and a wide-open write policy would let anyone poison it.
--
-- Safety rails on the write path:
--   * only AUTHENTICATED users may insert (anonymous visitors still read-only),
--   * only rows marked source in ('ai','community') — the trusted 'official'
--     seed can never be created or overwritten through the public API,
--   * inserts de-dup against the unique index below (client uses ignoreDuplicates),
--     so an existing official/community row is never clobbered by a new generation.

-- Topics JSONB now also carries an optional "module" per topic (module → topic →
-- subtopic), e.g. A-Level Maths → "Pure Mathematics"/"Statistics"/"Mechanics".
-- Shape: [{name, module?, difficulty, importance, subtopics:[]}]. No column change
-- needed — module lives inside the existing topics jsonb.

-- ─── de-dup key ───────────────────────────────────────────────────────────────
-- One canonical row per qualification × board × spec × subject (case-insensitive
-- subject). country is intentionally NOT part of the key: lookups (getCurriculum)
-- already ignore country, so keying on it would allow near-duplicate rows.
create unique index if not exists curriculum_combo_uidx on public.curriculum (
  qualification_id,
  coalesce(board, ''),
  coalesce(spec_version, ''),
  lower(subject)
);

-- ─── scoped INSERT policy ─────────────────────────────────────────────────────
drop policy if exists "curriculum community insert" on public.curriculum;
create policy "curriculum community insert"
  on public.curriculum for insert
  to authenticated
  with check (source in ('ai', 'community'));

-- ─── refresh A-Level Maths with module grouping (plan 2.1) ────────────────────
-- 02_curriculum_seed.sql seeded this row before topics carried a "module".
-- Re-run-safe: this UPDATE brings the live row up to the module → topic →
-- subtopic shape and adds the Pure/Statistics/Mechanics aliases so those names
-- are searchable. Runs after 02, so fresh installs AND existing DBs end correct.
update public.curriculum
set aliases = '["Mathematics","Math","Maths","Математика","матем","A-Level Maths","A-Level Mathematics","Pure Mathematics","Pure Maths","Pure","Statistics","Mechanics","Applied Mathematics"]'::jsonb,
    topics  = '[{"name":"Algebra and Proof","module":"Pure Mathematics","difficulty":5,"importance":6,"subtopics":["Algebraic manipulation","Surds","Indices","Polynomials","Factor theorem","Remainder theorem","Partial fractions","Algebraic proof","Mathematical reasoning"]},{"name":"Functions and Graphs","module":"Pure Mathematics","difficulty":5,"importance":6,"subtopics":["Function notation","Domain","Range","Composite functions","Inverse functions","Graph transformations","Modulus functions","Reciprocal functions","Exponential graphs","Logarithmic graphs"]},{"name":"Coordinate Geometry","module":"Pure Mathematics","difficulty":5,"importance":6,"subtopics":["Distance","Midpoint","Gradient","Straight line","Parallel lines","Perpendicular lines","Circles","Tangents","Normals"]},{"name":"Quadratics","module":"Pure Mathematics","difficulty":5,"importance":6,"subtopics":["Completing the square","Quadratic formula","Discriminant","Roots","Nature of roots","Sketching graphs"]},{"name":"Equations and Inequalities","module":"Pure Mathematics","difficulty":5,"importance":6,"subtopics":["Linear equations","Quadratic equations","Simultaneous equations","Polynomial equations","Rational equations","Linear inequalities","Quadratic inequalities","Modulus inequalities"]},{"name":"Sequences and Series","module":"Pure Mathematics","difficulty":5,"importance":6,"subtopics":["Arithmetic sequences","Geometric sequences","Sigma notation","Arithmetic series","Geometric series","Binomial expansion","Pascal''s Triangle"]},{"name":"Trigonometry","module":"Pure Mathematics","difficulty":5,"importance":6,"subtopics":["Radians","Arc length","Sector area","Trigonometric ratios","Exact values","Graphs","Identities","Double angle formulae","Compound angle formulae","Small angle approximations","Trigonometric equations"]},{"name":"Exponentials and Logarithms","module":"Pure Mathematics","difficulty":5,"importance":6,"subtopics":["Laws of logarithms","Natural logarithms","Exponential growth","Exponential decay","Modelling"]},{"name":"Differentiation","module":"Pure Mathematics","difficulty":5,"importance":6,"subtopics":["First principles","Power rule","Product rule","Quotient rule","Chain rule","Implicit differentiation","Parametric differentiation","Differentiating exponential functions","Differentiating logarithmic functions","Stationary points","Tangents","Normals","Increasing/decreasing functions"]},{"name":"Integration","module":"Pure Mathematics","difficulty":5,"importance":6,"subtopics":["Reverse differentiation","Indefinite integration","Definite integration","Area under curves","Area between curves","Integration by substitution","Integration by parts","Numerical integration (trapezium rule)"]},{"name":"Numerical Methods","module":"Pure Mathematics","difficulty":5,"importance":6,"subtopics":["Iteration","Fixed-point iteration","Newton-Raphson method","Error intervals"]},{"name":"Vectors","module":"Pure Mathematics","difficulty":5,"importance":6,"subtopics":["Vector notation","Magnitude","Unit vectors","Addition","Subtraction","Scalar multiplication","Position vectors","Vector equations","Proofs using vectors"]},{"name":"Data Presentation","module":"Statistics","difficulty":5,"importance":6,"subtopics":["Sampling","Types of data","Histograms","Box plots","Scatter graphs"]},{"name":"Measures","module":"Statistics","difficulty":5,"importance":6,"subtopics":["Mean","Median","Mode","Variance","Standard deviation","Quartiles","Percentiles"]},{"name":"Probability","module":"Statistics","difficulty":5,"importance":6,"subtopics":["Probability laws","Conditional probability","Independent events","Tree diagrams","Venn diagrams"]},{"name":"Statistical Distributions","module":"Statistics","difficulty":5,"importance":6,"subtopics":["Binomial distribution","Normal distribution","Standard normal distribution","Hypothesis testing"]},{"name":"Regression","module":"Statistics","difficulty":5,"importance":6,"subtopics":["Correlation","Product moment correlation coefficient","Regression line","Interpretation"]},{"name":"Quantities and Units","module":"Mechanics","difficulty":5,"importance":6,"subtopics":["Scalars","Vectors","SI units"]},{"name":"Kinematics","module":"Mechanics","difficulty":5,"importance":6,"subtopics":["Displacement","Distance","Velocity","Speed","Acceleration","SUVAT equations","Motion graphs"]},{"name":"Forces","module":"Mechanics","difficulty":5,"importance":6,"subtopics":["Newton''s Laws","Weight","Normal reaction","Tension","Friction","Resultant force"]},{"name":"Moments","module":"Mechanics","difficulty":5,"importance":6,"subtopics":["Moments","Couples","Equilibrium"]},{"name":"Projectiles","module":"Mechanics","difficulty":5,"importance":6,"subtopics":["Horizontal projection","Angled projection","Trajectories"]},{"name":"Momentum","module":"Mechanics","difficulty":5,"importance":6,"subtopics":["Conservation of momentum","Impulse","Collisions"]},{"name":"Work, Energy and Power","module":"Mechanics","difficulty":5,"importance":6,"subtopics":["Work","Kinetic energy","Potential energy","Power","Efficiency"]}]'::jsonb
where qualification_id = 'alevel'
  and lower(subject) = 'mathematics'
  and coalesce(board, '') = '';
