/**
 * AI Exam Coach — the five-step onboarding (Phase 3 §3d).
 *
 * A deliberate fork of `exam-wizard.jsx`, not a mode inside it (Decision Log
 * #40). That wizard is shared with "Add Exam" and carries multi-subject state
 * (`subjects[]`, per-subject durations, curriculum validation, syllabus
 * uploads) that is load-bearing there and pure friction here — the first
 * screen a stranger ever sees should not ask for a country, an education
 * level, a school year, an exam board and a syllabus before showing anything
 * of value. Keeping them separate costs more total code and buys the one
 * thing worth paying for: a change to "Add Exam" can never regress the
 * signup funnel, and vice versa.
 *
 * Five steps — exam, date, target, hours, account — then a plan preview.
 *
 * Two behaviours worth knowing about:
 *
 *  · The account step is LAST and skippable. Everything before it works on an
 *    anonymous Supabase session (the same one "Try the demo" already uses), so
 *    a visitor builds a real plan before deciding whether to sign up. Signing
 *    up then UPGRADES that anonymous user in place — see
 *    `upgradeAnonymousAccount` in auth-store.jsx for why that is not the same
 *    as calling signUp().
 *
 *  · Hours are collected per DAY, because nobody knows their week in hours.
 *    `profile.weeklyHours` stays the stored unit everywhere downstream
 *    (schedule-store's allocateBudget, AIPlan); this multiplies at commit
 *    time. It multiplies by the days/week the student picked rather than by 7
 *    — a flat ×7 would quietly claim they study every single day, inflating
 *    the budget the whole schedule is built from.
 */
import React from "react";
import { legacyFn, legacyOptional } from "../../lib/legacy";

// ─── the legacy globals this screen needs ───────────────────────────────────

type ScaleGrade = { kind: "scale"; options: string[]; current: string; target: string };
type ScoreGrade = { kind: "score"; min: number; max: number; step: number; suffix?: string; current: number; target: number };
type GradeDef = ScaleGrade | ScoreGrade;

interface ExamTypeDef {
  id: string;
  label: string;
  emoji: string;
  blurb: Record<string, string>;
  board: string;
  grade: GradeDef;
}

interface ExamDraft {
  name: string;
  color: null;
  examDate: string;
  examBoard: string;
  topicCount: number;
  targetGrade: string;
  currentGrade: string;
  gradingSystem: GradeDef;
  sessionsPerWeekHint: null;
  sessionLengthMin: number;
  courseId: null;
  explainLang: null;
  kind: "exam";
  qualificationId: string;
  topics?: string[];      // set for language exams (see LANGUAGE_SECTIONS)
  topicsStatus?: string;  // "ready" when we filled topics ourselves
}

interface CreatedExam {
  id: string;
}

interface ProfilePatch {
  weeklyHours: number;
  daysPerWeek: number;
  sessionLengthMin: number;
  planIntensity: string;
  studyDays: string[];
  hoursPerDay: number;
  blackoutSlots: { day: string; period: string }[];
}

type Lang = string;

const STEP_COUNT = 5;

// Language exams (IELTS, TOEFL, Duolingo) are ONE exam with fixed sections, not
// a subject picker — a student prepping for IELTS Reading + Listening is doing
// one IELTS with two sections active, not two separate exams. The wizard's
// section handling (buildSectionCourse) reads from CURRICULUM_SEED, but these
// three qualifications have no seed rows yet, so the fallback lives here.
// Order matches the real papers: Reading and Listening first (input skills),
// Speaking and Writing last (output skills).
const LANGUAGE_SECTIONS: Record<string, string[]> = {
  ielts: ["Listening", "Reading", "Writing", "Speaking"],
  toefl: ["Reading", "Listening", "Speaking", "Writing"],
  duolingo: ["Literacy", "Comprehension", "Conversation", "Production"],
};

// ─── copy ───────────────────────────────────────────────────────────────────
// Inline rather than in ONB (onboarding-data.jsx): these strings exist only
// here, and adding them to the shared table would make the old wizard's copy
// object grow keys it never renders.
type Copy = Record<string, string>;
const COPY: Record<string, Copy> = {
  en: {
    step: "Step", of: "of", back: "Back", next: "Continue", skip: "Skip for now",
    q_exam: "Which exam are you preparing for?", q_exam_sub: "Pick the qualification, then name the subject.",
    q_exam_sub_sections: "Pick which sections you want to prepare for.",
    sections_label: "Sections", sections_hint: "All on by default — untick anything you're not sitting.",
    sections_pick_at_least_one: "Pick at least one section.",
    pick_qual_first: "Pick a qualification above to continue.",
    subject_ph: "Subject — e.g. Mathematics",
    q_date: "When is it?", q_date_sub: "We build the schedule backwards from this date.",
    in_1m: "In a month", in_3m: "In 3 months", in_6m: "In 6 months",
    q_target: "What are you aiming for?", q_target_sub: "Your target on this exam's own scale.",
    when_of_day: "When of day", period_morning: "🌅 Morning", period_afternoon: "☀️ Afternoon", period_evening: "🌙 Evening",
    q_hours: "How much can you study a day?", q_hours_sub: "Be honest — a plan you can keep beats an ambitious one you drop.",
    days_week: "Days a week", per_day: "hours a day", weekly_total: "That's %H hours a week",
    q_account: "Save your plan", q_account_sub: "Your plan is ready. Create an account to keep it across devices.",
    name_ph: "Your name", email_ph: "Email", pw_ph: "Password (min 6 characters)",
    create: "Create account", building: "Building your plan", ready: "Your plan is ready",
    email_pending: "Check your email to confirm the address — your plan is saved either way.",
    plan_sessions: "study sessions", plan_weeks: "weeks", plan_hours: "hours total",
    start: "Start studying", pw_short: "Password needs at least 6 characters.", email_bad: "That doesn't look like an email address.",
    day_mon: "Mon", day_tue: "Tue", day_wed: "Wed", day_thu: "Thu", day_fri: "Fri", day_sat: "Sat", day_sun: "Sun",
    pick_at_least_one_day: "Pick at least one day you can study.",
  },
  uk: {
    step: "Крок", of: "з", back: "Назад", next: "Далі", skip: "Пропустити",
    q_exam: "До якого іспиту готуєтесь?", q_exam_sub: "Оберіть кваліфікацію та назвіть предмет.",
    q_exam_sub_sections: "Оберіть частини, до яких готуєтесь.",
    sections_label: "Частини", sections_hint: "Усі увімкнені — вимкніть те, що не складаєте.",
    sections_pick_at_least_one: "Оберіть хоча б одну частину.",
    pick_qual_first: "Оберіть кваліфікацію вище, щоб продовжити.",
    subject_ph: "Предмет — напр. Математика",
    q_date: "Коли він?", q_date_sub: "Розклад будується назад від цієї дати.",
    in_1m: "Через місяць", in_3m: "Через 3 місяці", in_6m: "Через 6 місяців",
    q_target: "Яка ваша ціль?", q_target_sub: "Ваш результат за шкалою цього іспиту.",
    when_of_day: "Коли зручно", period_morning: "🌅 Ранок", period_afternoon: "☀️ День", period_evening: "🌙 Вечір",
    q_hours: "Скільки можете вчитися на день?", q_hours_sub: "Чесно — план, якого дотримаєтесь, кращий за амбітний, який кинете.",
    days_week: "Днів на тиждень", per_day: "годин на день", weekly_total: "Це %H годин на тиждень",
    q_account: "Збережіть план", q_account_sub: "План готовий. Створіть акаунт, щоб мати його на всіх пристроях.",
    name_ph: "Ваше ім'я", email_ph: "Email", pw_ph: "Пароль (мін. 6 символів)",
    create: "Створити акаунт", building: "Будуємо ваш план", ready: "Ваш план готовий",
    email_pending: "Підтвердьте адресу в листі — план збережено в будь-якому разі.",
    plan_sessions: "занять", plan_weeks: "тижнів", plan_hours: "годин загалом",
    start: "Почати навчання", pw_short: "Пароль має бути щонайменше 6 символів.", email_bad: "Це не схоже на email.",
    day_mon: "Пн", day_tue: "Вт", day_wed: "Ср", day_thu: "Чт", day_fri: "Пт", day_sat: "Сб", day_sun: "Нд",
    pick_at_least_one_day: "Оберіть хоча б один день, коли можете вчитися.",
  },
  ru: {
    step: "Шаг", of: "из", back: "Назад", next: "Далее", skip: "Пропустить",
    q_exam: "К какому экзамену готовитесь?", q_exam_sub: "Выберите квалификацию и назовите предмет.",
    q_exam_sub_sections: "Выберите части, к которым готовитесь.",
    sections_label: "Части", sections_hint: "Все включены — снимите то, что не сдаёте.",
    sections_pick_at_least_one: "Выберите хотя бы одну часть.",
    pick_qual_first: "Выберите квалификацию выше, чтобы продолжить.",
    subject_ph: "Предмет — напр. Математика",
    q_date: "Когда он?", q_date_sub: "Расписание строится назад от этой даты.",
    in_1m: "Через месяц", in_3m: "Через 3 месяца", in_6m: "Через 6 месяцев",
    q_target: "К чему стремитесь?", q_target_sub: "Ваша цель по шкале этого экзамена.",
    when_of_day: "Когда удобно", period_morning: "🌅 Утро", period_afternoon: "☀️ День", period_evening: "🌙 Вечер",
    q_hours: "Сколько можете заниматься в день?", q_hours_sub: "Честно — план, который выдержите, лучше амбициозного, который бросите.",
    days_week: "Дней в неделю", per_day: "часов в день", weekly_total: "Это %H часов в неделю",
    q_account: "Сохраните план", q_account_sub: "План готов. Создайте аккаунт, чтобы он был на всех устройствах.",
    name_ph: "Ваше имя", email_ph: "Email", pw_ph: "Пароль (мин. 6 символов)",
    create: "Создать аккаунт", building: "Строим ваш план", ready: "Ваш план готов",
    email_pending: "Подтвердите адрес в письме — план сохранён в любом случае.",
    plan_sessions: "занятий", plan_weeks: "недель", plan_hours: "часов всего",
    start: "Начать учиться", pw_short: "Пароль должен быть не короче 6 символов.", email_bad: "Это не похоже на email.",
    day_mon: "Пн", day_tue: "Вт", day_wed: "Ср", day_thu: "Чт", day_fri: "Пт", day_sat: "Сб", day_sun: "Вс",
    pick_at_least_one_day: "Выберите хотя бы один день, когда можете учиться.",
  },
  fr: {
    step: "Étape", of: "sur", back: "Retour", next: "Continuer", skip: "Plus tard",
    q_exam: "Quel examen préparez-vous ?", q_exam_sub: "Choisissez la qualification, puis la matière.",
    q_exam_sub_sections: "Choisissez les sections à préparer.",
    sections_label: "Sections", sections_hint: "Toutes cochées par défaut — décochez ce que vous ne passez pas.",
    sections_pick_at_least_one: "Choisissez au moins une section.",
    pick_qual_first: "Choisissez une qualification ci-dessus pour continuer.",
    subject_ph: "Matière — ex. Mathématiques",
    q_date: "C'est quand ?", q_date_sub: "Le planning part de cette date, à rebours.",
    in_1m: "Dans un mois", in_3m: "Dans 3 mois", in_6m: "Dans 6 mois",
    q_target: "Votre objectif ?", q_target_sub: "Votre cible sur l'échelle de cet examen.",
    when_of_day: "Quand", period_morning: "🌅 Matin", period_afternoon: "☀️ Après-midi", period_evening: "🌙 Soir",
    q_hours: "Combien par jour ?", q_hours_sub: "Soyez honnête — un plan tenable vaut mieux qu'un plan ambitieux abandonné.",
    days_week: "Jours par semaine", per_day: "heures par jour", weekly_total: "Soit %H heures par semaine",
    q_account: "Enregistrez votre plan", q_account_sub: "Votre plan est prêt. Créez un compte pour le garder.",
    name_ph: "Votre nom", email_ph: "E-mail", pw_ph: "Mot de passe (min. 6 caractères)",
    create: "Créer un compte", building: "Création de votre plan", ready: "Votre plan est prêt",
    email_pending: "Confirmez l'adresse par e-mail — votre plan est enregistré dans tous les cas.",
    plan_sessions: "séances", plan_weeks: "semaines", plan_hours: "heures au total",
    start: "Commencer", pw_short: "Le mot de passe doit faire au moins 6 caractères.", email_bad: "Cela ne ressemble pas à un e-mail.",
    day_mon: "Lun", day_tue: "Mar", day_wed: "Mer", day_thu: "Jeu", day_fri: "Ven", day_sat: "Sam", day_sun: "Dim",
    pick_at_least_one_day: "Choisis au moins un jour où tu peux étudier.",
  },
  de: {
    step: "Schritt", of: "von", back: "Zurück", next: "Weiter", skip: "Später",
    q_exam: "Auf welche Prüfung bereitest du dich vor?", q_exam_sub: "Wähle den Abschluss, dann das Fach.",
    q_exam_sub_sections: "Wähle die Teile aus, auf die du dich vorbereitest.",
    sections_label: "Teile", sections_hint: "Alle standardmäßig an — deaktiviere, was du nicht ablegst.",
    sections_pick_at_least_one: "Wähle mindestens einen Teil.",
    pick_qual_first: "Wähle oben eine Prüfung, um fortzufahren.",
    subject_ph: "Fach — z. B. Mathematik",
    q_date: "Wann ist sie?", q_date_sub: "Der Plan wird von diesem Datum rückwärts gebaut.",
    in_1m: "In einem Monat", in_3m: "In 3 Monaten", in_6m: "In 6 Monaten",
    q_target: "Was ist dein Ziel?", q_target_sub: "Dein Ziel auf der Skala dieser Prüfung.",
    when_of_day: "Wann", period_morning: "🌅 Morgen", period_afternoon: "☀️ Nachmittag", period_evening: "🌙 Abend",
    q_hours: "Wie viel schaffst du pro Tag?", q_hours_sub: "Ehrlich — ein Plan, den du durchhältst, schlägt einen ehrgeizigen, den du abbrichst.",
    days_week: "Tage pro Woche", per_day: "Stunden pro Tag", weekly_total: "Das sind %H Stunden pro Woche",
    q_account: "Plan sichern", q_account_sub: "Dein Plan ist fertig. Erstelle ein Konto, um ihn zu behalten.",
    name_ph: "Dein Name", email_ph: "E-Mail", pw_ph: "Passwort (mind. 6 Zeichen)",
    create: "Konto erstellen", building: "Dein Plan wird gebaut", ready: "Dein Plan ist fertig",
    email_pending: "Bestätige die Adresse per E-Mail — dein Plan ist so oder so gespeichert.",
    plan_sessions: "Lerneinheiten", plan_weeks: "Wochen", plan_hours: "Stunden insgesamt",
    start: "Loslegen", pw_short: "Das Passwort braucht mindestens 6 Zeichen.", email_bad: "Das sieht nicht nach einer E-Mail aus.",
    day_mon: "Mo", day_tue: "Di", day_wed: "Mi", day_thu: "Do", day_fri: "Fr", day_sat: "Sa", day_sun: "So",
    pick_at_least_one_day: "Wähle mindestens einen Tag zum Lernen.",
  },
};

// ─── small shared bits ──────────────────────────────────────────────────────

function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const cardStyle: React.CSSProperties = {
  background: "var(--surface-card)",
  border: "1.5px solid var(--border-default)",
  borderRadius: "var(--radius-xl)",
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  textAlign: "left",
};

function selectable(on: boolean): React.CSSProperties {
  return {
    ...cardStyle,
    border: on ? "2px solid var(--indigo-500)" : "1.5px solid var(--border-default)",
    background: on ? "var(--indigo-50)" : "var(--surface-card)",
    color: on ? "var(--indigo-700)" : "var(--text-body)",
  };
}

function choiceClass(on: boolean): string {
  return "onb-choice" + (on ? " is-on" : "");
}

function CountUp({ to }: { to: number }) {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setN(to); return undefined; }
    const start = performance.now();
    const dur = 640;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(to * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{n}</>;
}

function PrimaryButton({ disabled, onClick, children, burst }: { disabled?: boolean; onClick: () => void; children: React.ReactNode; burst?: boolean }) {
  return (
    <button
      type="button" className={"ux-press" + (burst ? " onb-cta-ready" : "")} disabled={disabled} onClick={onClick}
      style={{
        width: "100%", minHeight: 52, borderRadius: "var(--radius-full)", border: "none",
        background: disabled ? "var(--slate-300)" : "var(--ink-900)", color: "var(--white)",
        fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)",
        cursor: disabled ? "default" : "pointer", fontFamily: "var(--font-sans)",
      }}
    >
      {children}
    </button>
  );
}

// ─── the screen ─────────────────────────────────────────────────────────────

interface Props {
  onFinish: (exams: CreatedExam[]) => void;
  lang: Lang;
  onLangChange?: (code: string) => void;
}

export function QuickOnboarding({ onFinish, lang }: Props) {
  const c = COPY[lang] ?? COPY.en;
  const tr = (k: string) => (c as Copy)[k] ?? (COPY.en as Copy)[k] ?? k;

  const examTypes = legacyOptional<ExamTypeDef[]>("EXAM_TYPES") ?? [];
  const examTypeOf = legacyFn<(id: string) => ExamTypeDef>("examType");
  const commitExamWizard = legacyFn<(a: { examDrafts: ExamDraft[]; profilePatch: ProfilePatch }) => CreatedExam[]>("commitExamWizard");
  const searchSubjects = legacyOptional<(country: string | null, qual: string, board: string | null, q: string) => { subject: string }[]>("searchCurriculumSubjects");

  const [stepIdx, setStepIdx] = React.useState(0); // 0..4, then 5 = preview
  const [qualId, setQualId] = React.useState<string>("");
  const [subject, setSubject] = React.useState("");
  const [sections, setSections] = React.useState<Record<string, string[]>>({});
  // Time-of-day windows the student says they can actually study in. Written
  // out to profile.blackoutSlots at commit time as the INVERTED set (blackouts
  // are the ones NOT picked), so the scheduler places sessions inside these
  // hours. Default is evening only — matches "after school/work", which is
  // when the vast majority of high-school and uni students report studying.
  const [studyPeriods, setStudyPeriods] = React.useState<Array<"morning" | "afternoon" | "evening">>(["evening"]);
  const [examDate, setExamDate] = React.useState(() => addDaysISO(90));
  const [target, setTarget] = React.useState<string | number | null>(null);
  const [hoursPerDay, setHoursPerDay] = React.useState(2);
  // Explicit weekday picker — was implicit "first N days of the week" before,
  // so a student who could only do weekends ended up with an empty calendar
  // (Phase 3, live-caught scheduler bug).
  const [studyDays, setStudyDays] = React.useState<string[]>(["mon", "tue", "wed", "thu", "fri"]);
  const daysPerWeek = studyDays.length;
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [authBusy, setAuthBusy] = React.useState(false);
  const [emailPending, setEmailPending] = React.useState(false);
  const [created, setCreated] = React.useState<CreatedExam[] | null>(null);
  const [previewReady, setPreviewReady] = React.useState(false);
  const [dir, setDir] = React.useState(1);
  const [ctaBurst, setCtaBurst] = React.useState(false);
  const prevCan = React.useRef(false);
  // Captured once: reading the clock during render makes the same state
  // produce different output on a re-render.
  const [mountedAt] = React.useState(() => Date.now());

  const qual: ExamTypeDef | null = qualId ? examTypeOf(qualId) : null;
  // Available section names, or null when the current qualification is not
  // language-sectioned (GCSE/NMT etc — those use the subject input instead).
  const availableSections = qualId ? LANGUAGE_SECTIONS[qualId] : undefined;
  const isSectionExam = !!availableSections;
  // Which sections this student picked for the current qualification, defaulting
  // to all-on the first time they see this qualification.
  const activeSections = qualId && isSectionExam
    ? (sections[qualId] ?? availableSections!)
    : [];

  // An anonymous Supabase session is what lets the four steps before the
  // account step actually work (AI calls are quota'd per user, see
  // supabase/07_ai_usage.sql). Started on mount so it is ready long before
  // anyone reaches step 5, and deliberately not awaited — a failure here
  // degrades to "no AI until you sign up", not a blocked onboarding.
  React.useEffect(() => {
    const getSession = legacyOptional<() => unknown>("getSession");
    const startDemo = legacyOptional<() => Promise<unknown>>("startDemo");
    if (!startDemo || (getSession && getSession())) return;
    void startDemo();
  }, []);

  // Step 3 opens on the qualification's own suggested target rather than
  // empty. Derived, not copied into state by an effect: `target` stays null
  // until the student actually moves the control, and picking a different
  // qualification resets it (an "A" target is meaningless once they switch to
  // the 100–200 НМТ scale).
  const effectiveTarget = target ?? qual?.grade.target ?? "";

  const weeklyHours = Math.max(1, Math.round(hoursPerDay * daysPerWeek));

  const canContinue = (() => {
    switch (stepIdx) {
      // Language exams: valid the moment the qual is picked (all sections on
      // by default). Non-language: need a subject name.
      case 0: return !!qualId && (isSectionExam ? activeSections.length > 0 : subject.trim().length > 0);
      case 1: return examDate >= new Date().toISOString().slice(0, 10);
      case 2: return effectiveTarget !== "";
      case 3: return hoursPerDay > 0 && studyDays.length > 0;
      default: return true;
    }
  })();

  React.useEffect(() => {
    const was = prevCan.current;
    prevCan.current = canContinue;
    if (!canContinue || was) return undefined;
    setCtaBurst(true);
    const id = setTimeout(() => setCtaBurst(false), 340);
    return () => clearTimeout(id);
  }, [canContinue]);

  // Writes the exam + profile, then moves to the preview. Runs when the
  // student reaches the account step — NOT when they finish it — so the plan
  // exists (and the preview has something real to show) whether or not they
  // choose to sign up.
  const committedRef = React.useRef(false);
  const commit = () => {
    // Ref, not the `created` state: goNext and the skip button can both reach
    // here, and state set in one handler is not visible to the next until a
    // render has happened.
    if (committedRef.current || !qual) return;
    committedRef.current = true;
    const label = qual.label;
    // Language exam: the "subject" IS the exam (IELTS itself), and the picked
    // sections are its topics. Non-language: prefix the subject with the qual
    // label so a student prepping for the same subject across boards can tell
    // them apart on the dashboard.
    let examName: string;
    let topics: string[] | undefined;
    if (isSectionExam) {
      examName = label;
      topics = activeSections;
    } else {
      const raw = subject.trim() || "My subject";
      examName = qualId === "custom" || qualId === "uni" || raw.toLowerCase().startsWith(label.toLowerCase())
        ? raw
        : `${label} ${raw}`;
      topics = undefined;
    }
    const draft: ExamDraft = {
      name: examName,
      color: null,
      examDate,
      examBoard: qual.board,
      topicCount: topics ? topics.length : 10,
      targetGrade: String(effectiveTarget || qual.grade.target),
      currentGrade: String(qual.grade.current),
      gradingSystem: qual.grade,
      sessionsPerWeekHint: null,
      sessionLengthMin: 45,
      courseId: null,
      explainLang: null,
      kind: "exam",
      qualificationId: qualId,
      ...(topics ? { topics, topicsStatus: "ready" } : {}),
    };
    const exams = commitExamWizard({
      examDrafts: [draft],
      // weeklyHours is the unit the scheduler reads; hours/day is only ever an
      // input format. See the module header for why this is × daysPerWeek.
      // blackoutSlots is the INVERSE of studyPeriods: the scheduler treats
      // any weekday/period pair in blackoutSlots as unavailable. So if the
      // student picked "evening", we block morning+afternoon on every day.
      // (studyDays already handles which weekdays; this handles which hours.)
      profilePatch: {
        weeklyHours, daysPerWeek, sessionLengthMin: 45, planIntensity: "balanced", studyDays, hoursPerDay,
        blackoutSlots: (["mon","tue","wed","thu","fri","sat","sun"] as const).flatMap((day) =>
          (["morning","afternoon","evening"] as const)
            .filter((period) => !studyPeriods.includes(period))
            .map((period) => ({ day, period }))
        ),
      },
    });
    setCreated(exams);
    // Language exams already carry real topic names (the sections), so an AI
    // enrichment call would overwrite them with a hallucinated list. For
    // everything else we still kick off the background name-extraction.
    if (!topics) {
      const enrich = legacyOptional<(id: string, exam: CreatedExam, files: unknown[]) => void>("requestCourseExtraction")
        ?? legacyOptional<(id: string, exam: CreatedExam, files: unknown[]) => void>("requestTopicNames");
      if (enrich) exams.forEach((e) => enrich(e.id, e, []));
    }
  };

  const goNext = () => {
    setDir(1);
    if (stepIdx === 3) commit(); // entering the account step
    setStepIdx((i) => Math.min(STEP_COUNT, i + 1));
  };
  const goBack = () => {
    setDir(-1);
    setStepIdx((i) => Math.max(0, i - 1));
  };

  const toPreview = () => {
    setDir(1);
    commit();
    setStepIdx(STEP_COUNT);
  };

  // The preview's pause is honest padding, not a fake loading bar: the plan is
  // computed locally and synchronously by commitExamWizard above, so there is
  // no network wait to mask. AIPlan.jsx's 6.4s animation sequence is the thing
  // being replaced here.
  React.useEffect(() => {
    if (stepIdx !== STEP_COUNT) return undefined;
    const id = setTimeout(() => setPreviewReady(true), 900);
    return () => clearTimeout(id);
  }, [stepIdx]);

  const submitAccount = async () => {
    setAuthError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setAuthError(tr("email_bad")); return; }
    if (password.length < 6) { setAuthError(tr("pw_short")); return; }
    const upgrade = legacyOptional<(a: { name: string; email: string; password: string }) => Promise<{ emailPending: boolean }>>("upgradeAnonymousAccount");
    if (!upgrade) { toPreview(); return; }
    setAuthBusy(true);
    try {
      const res = await upgrade({ name, email, password });
      setEmailPending(!!res.emailPending);
      toPreview();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : String(err));
    } finally {
      setAuthBusy(false);
    }
  };

  // ── plan summary, read back from what was actually scheduled ─────────────
  const planStats = React.useMemo(() => {
    if (!created || !created.length) return null;
    const getSchedule = legacyOptional<() => { sessions?: { examId: string; durationMin?: number | null }[] }>("getSchedule");
    const sessions = getSchedule ? (getSchedule().sessions ?? []) : [];
    const all = sessions.filter((s) => created.some((e) => e.id === s.examId));
    const minutes = all.reduce((sum, s) => sum + (s.durationMin ?? 45), 0);
    const days = Math.max(1, Math.round((new Date(examDate).getTime() - mountedAt) / 86400000));
    return { sessions: all.length, weeks: Math.max(1, Math.round(days / 7)), hours: Math.round(minutes / 60) };
  }, [created, examDate, mountedAt]);

  const heading = (title: string, sub: string) => (
    <div className="onb-heading" style={{ marginBottom: "var(--space-6)" }}>
      <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)", lineHeight: 1.2 }}>{title}</h1>
      <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)", lineHeight: 1.5 }}>{sub}</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", fontFamily: "var(--font-sans)", padding: "var(--space-8) var(--space-4)" }}>
      <div className="onb-shell" style={{ width: "100%", maxWidth: 480 }}>
        {/* Progress — a plain counter and a bar. A student mid-signup wants to
            know how much is left, which a step count answers and a decorative
            stepper does not. */}
        {stepIdx < STEP_COUNT && (
          <div style={{ marginBottom: "var(--space-6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
              <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)" }}>
                {tr("step")} {stepIdx + 1} {tr("of")} {STEP_COUNT}
              </span>
              {stepIdx > 0 && (
                <button type="button" onClick={goBack} style={{ border: "none", background: "transparent", color: "var(--text-muted)", fontSize: "var(--text-sm)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  ← {tr("back")}
                </button>
              )}
            </div>
            <div className="onb-bar">
              {/* scaleX rather than an animated width — a width transition
                  relayouts the bar on every frame of every step change. */}
              <div className="onb-bar-fill" style={{ transform: `scaleX(${(stepIdx + 1) / STEP_COUNT})` }} />
            </div>
          </div>
        )}

        <div className="onb-stage">
        <div key={stepIdx} className={dir > 0 ? "onb-step onb-step--fwd" : "onb-step onb-step--back"}>

        {/* ── 1. exam ───────────────────────────────────────────────────── */}
        {stepIdx === 0 && (
          <div>
            {heading(tr("q_exam"), isSectionExam ? tr("q_exam_sub_sections") : tr("q_exam_sub"))}
            <div className={"onb-stagger onb-choices" + (qualId ? " has-pick" : "")} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
              {examTypes.map((e) => (
                <button key={e.id} type="button" className={choiceClass(qualId === e.id)} onClick={() => { setQualId(e.id); setTarget(null); }} style={{ ...selectable(qualId === e.id), padding: "var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <span style={{ fontSize: 20 }}>{e.emoji}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)" }}>{e.label}</span>
                    <span style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.blurb[lang] ?? e.blurb.en}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            {/* Section-based language exams (IELTS/TOEFL/Duolingo): the
                "subject" IS the exam and the four papers are its topics —
                asking for a subject name is nonsensical here (would produce
                names like "IELTS reading" that duplicate what the exam
                already implies). Chip grid of sections instead, all-on by
                default, unclick what you're not preparing for. */}
            {qualId && isSectionExam && (
              <div>
                <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>
                  {tr("sections_label")}
                </p>
                <div className="onb-stagger" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                  {availableSections!.map((sec) => {
                    const on = activeSections.includes(sec);
                    return (
                      <button
                        key={sec} type="button" aria-pressed={on} className={choiceClass(on)}
                        onClick={() => setSections((cur) => ({
                          ...cur,
                          [qualId]: on ? activeSections.filter((s) => s !== sec) : [...activeSections, sec],
                        }))}
                        style={{ ...selectable(on), padding: "var(--space-3) var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-2)", minHeight: 52 }}
                      >
                        <span style={{ width: 20, height: 20, borderRadius: 6, background: on ? "var(--indigo-600)" : "var(--surface-page)", border: on ? "none" : "1.5px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--white)", fontSize: 13, flexShrink: 0 }}>
                          {on ? "✓" : ""}
                        </span>
                        <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)" }}>{sec}</span>
                      </button>
                    );
                  })}
                </div>
                <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xs)", color: activeSections.length ? "var(--text-faint)" : "var(--red-700)" }}>
                  {activeSections.length ? tr("sections_hint") : tr("sections_pick_at_least_one")}
                </p>
              </div>
            )}

            {/* Non-language qualifications: freeform subject name with a real
                autocomplete against the bundled curriculum catalog. */}
            {qualId && !isSectionExam && (
              <>
                <input
                  value={subject} onChange={(ev) => setSubject(ev.target.value)} placeholder={tr("subject_ph")}
                  style={{ width: "100%", minHeight: 52, padding: "0 var(--space-4)", borderRadius: "var(--radius-lg)", border: "1.5px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-strong)", fontSize: "var(--text-base)", fontFamily: "var(--font-sans)", boxSizing: "border-box" }}
                />
                {searchSubjects && subject.trim().length >= 1 && (() => {
                  const q = subject.trim().toLowerCase();
                  const rows = searchSubjects(null, qualId, null, subject.trim()).slice(0, 6);
                  const shown = rows.filter((r) => r.subject.toLowerCase() !== q);
                  if (!shown.length) return null;
                  return (
                    <div style={{ marginTop: "var(--space-2)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", background: "var(--surface-card)", overflow: "hidden" }}>
                      {shown.map((r) => (
                        <button
                          key={r.subject} type="button" onClick={() => setSubject(r.subject)}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "10px var(--space-4)", border: "none", background: "transparent", color: "var(--text-strong)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", cursor: "pointer" }}
                        >
                          {r.subject}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </>
            )}

            {!qualId && (
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-faint)", textAlign: "center" }}>
                {tr("pick_qual_first")}
              </p>
            )}
          </div>
        )}

        {/* ── 2. date ───────────────────────────────────────────────────── */}
        {stepIdx === 1 && (
          <div>
            {heading(tr("q_date"), tr("q_date_sub"))}
            <input
              type="date" value={examDate} min={new Date().toISOString().slice(0, 10)}
              onChange={(ev) => setExamDate(ev.target.value)}
              style={{ width: "100%", minHeight: 52, padding: "0 var(--space-4)", borderRadius: "var(--radius-lg)", border: "1.5px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-strong)", fontSize: "var(--text-base)", fontFamily: "var(--font-sans)", boxSizing: "border-box", marginBottom: "var(--space-3)" }}
            />
            <div className="onb-choices has-pick" style={{ display: "flex", gap: "var(--space-2)" }}>
              {[[30, "in_1m"], [90, "in_3m"], [180, "in_6m"]].map(([days, key]) => {
                const iso = addDaysISO(days as number);
                return (
                  <button key={key as string} type="button" className={choiceClass(examDate === iso)} onClick={() => setExamDate(iso)} style={{ ...selectable(examDate === iso), flex: 1, minHeight: 44, textAlign: "center", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", padding: "0 var(--space-2)" }}>
                    {tr(key as string)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 3. target ─────────────────────────────────────────────────── */}
        {stepIdx === 2 && qual && (
          <div>
            {heading(tr("q_target"), tr("q_target_sub"))}
            {qual.grade.kind === "scale" ? (
              <div className="onb-choices has-pick" style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                {qual.grade.options.map((opt) => (
                  <button key={opt} type="button" className={choiceClass(effectiveTarget === opt)} onClick={() => setTarget(opt)} style={{ ...selectable(effectiveTarget === opt), minWidth: 56, minHeight: 52, textAlign: "center", fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", fontFamily: "var(--font-mono)" }}>
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <p style={{ textAlign: "center", margin: "0 0 var(--space-3)" }}>
                  <span key={String(effectiveTarget)} className="onb-num" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-6xl)", fontWeight: "var(--weight-bold)", color: "var(--indigo-600)", lineHeight: 1 }}>
                    {String(effectiveTarget)}
                  </span>
                  {qual.grade.suffix && <span style={{ fontSize: "var(--text-lg)", color: "var(--text-muted)" }}>{qual.grade.suffix}</span>}
                </p>
                <input
                  type="range" min={qual.grade.min} max={qual.grade.max} step={qual.grade.step}
                  value={Number(effectiveTarget)}
                  onChange={(ev) => setTarget(Number(ev.target.value))}
                  style={{ width: "100%", accentColor: "var(--indigo-600)", height: 28 }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xs)", color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>
                  <span>{qual.grade.min}</span><span>{qual.grade.max}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 4. hours ──────────────────────────────────────────────────── */}
        {stepIdx === 3 && (
          <div>
            {heading(tr("q_hours"), tr("q_hours_sub"))}
            <div style={{ textAlign: "center", marginBottom: "var(--space-3)" }}>
              <span key={hoursPerDay} className="onb-num" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-6xl)", fontWeight: "var(--weight-bold)", color: "var(--indigo-600)", lineHeight: 1 }}>{hoursPerDay}</span>
              <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{tr("per_day")}</p>
            </div>
            <div className="onb-choices has-pick" style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)" }}>
              {[1, 2, 3, 4, 6].map((h) => (
                <button key={h} type="button" className={choiceClass(hoursPerDay === h)} onClick={() => setHoursPerDay(h)} style={{ ...selectable(hoursPerDay === h), flex: 1, minHeight: 48, textAlign: "center", fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)" }}>
                  {h}h
                </button>
              ))}
            </div>
            <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>{tr("days_week")}</p>
            {/* Explicit weekday chips — Sun-only students get a plan on Sunday,
                weekday-only students get one on weekdays. The scheduler reads
                this exact list, no "first N days of the week" guessing. */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["mon","tue","wed","thu","fri","sat","sun"] as const).map((d) => {
                const on = studyDays.includes(d);
                return (
                  <button
                    key={d} type="button" className={choiceClass(on)}
                    onClick={() => setStudyDays((cur) => on ? cur.filter((x) => x !== d) : [...cur, d])}
                    aria-pressed={on}
                    style={{ ...selectable(on), flex: 1, minHeight: 44, textAlign: "center", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", padding: "0 6px" }}
                  >
                    {(tr("day_" + d) || d).slice(0, 3)}
                  </button>
                );
              })}
            </div>
            <p style={{ margin: "var(--space-4) 0 var(--space-5)", textAlign: "center", fontSize: "var(--text-sm)", color: studyDays.length ? "var(--text-muted)" : "var(--red-700)" }}>
              {studyDays.length
                ? tr("weekly_total").replace("%H", String(weeklyHours))
                : tr("pick_at_least_one_day")}
            </p>

            {/* Time-of-day chips. Scheduler currently drops the first session
                at 15:00 for every profile with no blackoutSlots — turning this
                choice into real blackoutSlots at commit time makes the very
                first calendar look right instead of always the same 15:00 default. */}
            <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>
              {tr("when_of_day")}
            </p>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              {([
                { key: "morning", label: tr("period_morning") },
                { key: "afternoon", label: tr("period_afternoon") },
                { key: "evening", label: tr("period_evening") },
              ] as const).map((p) => {
                const on = studyPeriods.includes(p.key);
                return (
                  <button
                    key={p.key} type="button" aria-pressed={on} className={choiceClass(on)}
                    onClick={() => setStudyPeriods((cur) => on
                      ? (cur.length > 1 ? cur.filter((x) => x !== p.key) : cur) // must keep at least one
                      : [...cur, p.key])}
                    style={{ ...selectable(on), flex: 1, minHeight: 52, textAlign: "center", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", padding: "0 6px" }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 5. account ────────────────────────────────────────────────── */}
        {stepIdx === 4 && (
          <div>
            {heading(tr("q_account"), tr("q_account_sub"))}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
              {[
                { v: name, set: setName, ph: tr("name_ph"), type: "text", ac: "name" },
                { v: email, set: setEmail, ph: tr("email_ph"), type: "email", ac: "email" },
                { v: password, set: setPassword, ph: tr("pw_ph"), type: "password", ac: "new-password" },
              ].map((f) => (
                <input
                  key={f.ac} type={f.type} value={f.v} autoComplete={f.ac} placeholder={f.ph}
                  onChange={(ev) => f.set(ev.target.value)}
                  style={{ width: "100%", minHeight: 52, padding: "0 var(--space-4)", borderRadius: "var(--radius-lg)", border: "1.5px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-strong)", fontSize: "var(--text-base)", fontFamily: "var(--font-sans)", boxSizing: "border-box" }}
                />
              ))}
            </div>
            {authError && (
              <p role="alert" className="onb-shake" style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", color: "var(--red-700)" }}>{authError}</p>
            )}
          </div>
        )}

        {/* ── preview ───────────────────────────────────────────────────── */}
        {stepIdx === STEP_COUNT && (
          <div style={{ textAlign: "center", paddingTop: "var(--space-8)" }}>
            {!previewReady ? (
              <div>
                <p style={{ fontSize: 44, margin: "0 0 var(--space-3)" }}>🗓️</p>
                <p style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>{tr("building")}</p>
                <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: "var(--space-3)" }}>
                  {[0, 1, 2].map((d) => (
                    <span key={d} style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--indigo-500)", animation: `loadDot 1.2s ${d * 0.2}s ease-in-out infinite` }} />
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p className="onb-ready-mark" style={{ fontSize: 44, margin: "0 0 var(--space-3)" }}>✨</p>
                <h1 className="onb-heading" style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>{tr("ready")}</h1>
                {planStats && (
                  <div className="onb-ready-stats" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)", margin: "var(--space-6) 0" }}>
                    {[
                      { val: planStats.sessions, label: tr("plan_sessions") },
                      { val: planStats.weeks, label: tr("plan_weeks") },
                      { val: planStats.hours, label: tr("plan_hours") },
                    ].map((s, i) => (
                      <div key={i} style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "var(--space-3) var(--space-2)" }}>
                        <p style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)", fontFamily: "var(--font-mono)", color: "var(--indigo-600)", fontVariantNumeric: "tabular-nums" }}><CountUp to={s.val} /></p>
                        <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}
                {emailPending && (
                  <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{tr("email_pending")}</p>
                )}
                <PrimaryButton burst onClick={() => onFinish(created ?? [])}>{tr("start")} →</PrimaryButton>
              </div>
            )}
          </div>
        )}

        </div>
        </div>

        {/* ── footer ────────────────────────────────────────────────────── */}
        {stepIdx < STEP_COUNT && (
          <div style={{ marginTop: "var(--space-8)" }}>
            {stepIdx === 4 ? (
              <>
                <PrimaryButton disabled={authBusy} onClick={() => void submitAccount()}>
                  {authBusy ? "…" : tr("create")}
                </PrimaryButton>
                {/* Skipping is a real, supported path — the plan is already
                    saved on this device. It just doesn't follow them to
                    another one until they sign up. */}
                <button
                  type="button" onClick={toPreview}
                  style={{ display: "block", width: "100%", marginTop: "var(--space-3)", border: "none", background: "transparent", color: "var(--text-faint)", fontSize: "var(--text-sm)", cursor: "pointer", fontFamily: "var(--font-sans)", padding: "var(--space-2)" }}
                >
                  {tr("skip")}
                </button>
              </>
            ) : (
              <PrimaryButton burst={ctaBurst} disabled={!canContinue} onClick={goNext}>{tr("next")} →</PrimaryButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
