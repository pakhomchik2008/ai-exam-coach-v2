/**
 * Root component. Ported out of the inline <script type="text/babel"> that used
 * to live at the bottom of index.html, with behavior preserved exactly.
 *
 * Every screen it renders is still defined by an unconverted `.jsx` module that
 * publishes itself onto `window`; `legacyComponent()` marks each of those as a
 * conversion to-do and throws by name if one fails to load.
 */
import React from "react";
import { legacyComponent, legacyFn, legacyOptional } from "../lib/legacy";
import {
  TWEAK_DEFAULTS,
  applyTweaks,
  ACCENT_OPTIONS,
  DENSITY_OPTIONS,
  DEPTH_OPTIONS,
} from "./tweaks";

type AnyProps = Record<string, unknown>;
type Dict = Record<string, string>;
type Tweaks = { accent: string; density: string; depth: string };

type Route = "landing" | "onboarding" | "planning" | "app";

interface ExamLike {
  id: string;
}

export function App() {
  const useTweaks = legacyFn<(d: typeof TWEAK_DEFAULTS) => [Tweaks, (k: string, v: string) => void]>(
    "useTweaks",
  );
  const getSession = legacyFn<() => unknown>("getSession");
  const getProfile = legacyFn<() => Dict>("getProfile");
  const saveProfile = legacyFn<(patch: Dict) => void>("saveProfile");
  const hasProfile = legacyFn<() => boolean>("hasProfile");

  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = React.useState<Route>(() => (getSession() ? "app" : "landing"));
  const [tab, setTab] = React.useState("dashboard");

  // Lazy-initialized from the saved profile so a reload keeps whatever language
  // the student picked last time, instead of silently resetting to English every
  // fresh page load. setLang below keeps the two in sync going forward — a plain
  // useState setter would only ever change this component's in-memory copy,
  // never the persisted profile.lang the AI layer (ai-brain.jsx) reads to decide
  // what language to answer in.
  const [lang, setLangState] = React.useState<string>(() => getProfile().lang || "en");
  const setLang = (code: string) => {
    setLangState(code);
    saveProfile({ lang: code });
  };

  const [chatQuery, setChatQuery] = React.useState<string | null>(null);
  const [planExamIds, setPlanExamIds] = React.useState<string[] | null>(null);

  // Bumped whenever another tab/window writes to one of this app's localStorage
  // keys. localStorage itself is already shared across tabs in the same origin —
  // the gap was that a mounted screen here never knew to re-read it.
  const [dataVersion, setDataVersion] = React.useState(0);

  // Re-apply CSS overrides whenever a tweak changes.
  React.useEffect(() => {
    applyTweaks(tw.accent, tw.density, tw.depth);
  }, [tw.accent, tw.density, tw.depth]);

  React.useEffect(() => {
    const sessionKey = legacyOptional<string>("SESSION_KEY");
    const syncedKeys = [
      legacyOptional<string>("EXAMS_KEY"),
      legacyOptional<string>("SCHEDULE_KEY"),
      legacyOptional<string>("PROFILE_KEY"),
      legacyOptional<string>("ACCOUNTS_KEY"),
      sessionKey,
      legacyOptional<string>("MISTAKES_KEY"),
      legacyOptional<string>("ACTIVE_SESSION_KEY"),
    ];

    const onStorage = (e: StorageEvent) => {
      if (e.key && !syncedKeys.includes(e.key)) return;
      if (e.key === sessionKey) {
        // A logout (or login) in another tab should be reflected here too, not
        // just the data underneath an already-rendered screen.
        setRoute(getSession() ? "app" : "landing");
      }
      setDataVersion((v) => v + 1);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [getSession]);

  const langs = legacyOptional<Record<string, Dict>>("LANGS") ?? {};
  const t: Dict = langs[lang] ?? langs["en"] ?? {};

  const goApp = () => {
    setRoute("app");
    setTab("dashboard");
  };
  const goPlanning = (newExams?: ExamLike[] | null) => {
    setPlanExamIds(newExams ? newExams.map((e) => e.id) : null);
    setRoute("planning");
  };
  const goToChat = (query?: string) => {
    setTab("chat");
    setChatQuery(query || null);
  };
  // After Sign Up / Log In / Try Demo: a returning account with existing data (or
  // a demo session that already ran onboarding once) skips straight to the
  // dashboard; anyone with no profile yet goes through onboarding once.
  const goAfterAuth = () => {
    setRoute(hasProfile() ? "app" : "onboarding");
    setTab("dashboard");
  };

  if (route === "landing") {
    const Landing = legacyComponent<AnyProps>("Landing");
    return <Landing onContinue={goAfterAuth} t={t} lang={lang} onLangChange={setLang} />;
  }
  if (route === "onboarding") {
    const Onboarding = legacyComponent<AnyProps>("Onboarding");
    return (
      <Onboarding
        onFinish={(newExams: ExamLike[]) => goPlanning(newExams)}
        lang={lang}
        onLangChange={setLang}
      />
    );
  }
  if (route === "planning") {
    const AIPlan = legacyComponent<AnyProps>("AIPlan");
    return <AIPlan examIds={planExamIds} onStart={goApp} t={t} />;
  }

  const AppNav = legacyComponent<AnyProps>("AppNav");
  const StudyLayer = legacyComponent<AnyProps>("StudyLayer");
  const TweaksPanel = legacyComponent<AnyProps>("TweaksPanel");
  const TweakSection = legacyComponent<AnyProps>("TweakSection");
  const TweakRadio = legacyComponent<AnyProps>("TweakRadio");

  const content = renderTab({
    tab,
    t,
    lang,
    setLang,
    chatQuery,
    setChatQuery,
    setTab,
    setRoute,
    goToChat,
    goPlanning,
  });

  return (
    <div>
      <AppNav
        current={tab}
        onNavigate={(id: string) => setTab(id)}
        onLogout={() => setRoute("landing")}
        lang={lang}
        onLangChange={setLang}
      />

      {/* NOTE: the original code carried a comment claiming `key={dataVersion}`
          remounts the screen when another tab writes to localStorage — but no
          such key was ever applied, so cross-tab sync only re-renders App and
          child screens keep serving what they read on their own first mount.
          Preserved as-is here (Phase 1 is behavior-frozen); logged in
          docs/audit.md as finding #28 to fix deliberately, with a test, once
          the Supabase sync layer lands in Phase 2. `dataVersion` is referenced
          below purely to keep the state wired until then. */}
      <main
        data-data-version={dataVersion}
        style={{
          maxWidth: "var(--container-app)",
          margin: "0 auto",
          padding: "var(--space-8) var(--space-4)",
        }}
      >
        {content}
      </main>

      {/* Active study session — app-level overlay + floating mini-timer.
          Rendered ABOVE whatever tab is open, so switching tabs can never lose a
          running session. */}
      <StudyLayer t={t} />

      <TweaksPanel>
        <TweakSection label="Accent colour" />
        <TweakRadio
          label="Palette"
          value={tw.accent}
          options={ACCENT_OPTIONS}
          onChange={(v: string) => setTweak("accent", v)}
        />

        <TweakSection label="Density" />
        <TweakRadio
          label="Spacing"
          value={tw.density}
          options={DENSITY_OPTIONS}
          onChange={(v: string) => setTweak("density", v)}
        />

        <TweakSection label="Card depth" />
        <TweakRadio
          label="Elevation"
          value={tw.depth}
          options={DEPTH_OPTIONS}
          onChange={(v: string) => setTweak("depth", v)}
        />
      </TweaksPanel>
    </div>
  );
}

interface TabArgs {
  tab: string;
  t: Dict;
  lang: string;
  setLang: (code: string) => void;
  chatQuery: string | null;
  setChatQuery: (q: string | null) => void;
  setTab: (id: string) => void;
  setRoute: (r: Route) => void;
  goToChat: (query?: string) => void;
  goPlanning: (newExams?: ExamLike[] | null) => void;
}

function renderTab({
  tab,
  t,
  lang,
  setLang,
  chatQuery,
  setChatQuery,
  setTab,
  setRoute,
  goToChat,
  goPlanning,
}: TabArgs) {
  switch (tab) {
    case "chat": {
      const AIChat = legacyComponent<AnyProps>("AIChat");
      return <AIChat t={t} initialQuery={chatQuery} onConsumeQuery={() => setChatQuery(null)} />;
    }
    case "study": {
      const StudyHub = legacyComponent<AnyProps>("StudyHub");
      return <StudyHub t={t} />;
    }
    case "journal": {
      const MistakeJournal = legacyComponent<AnyProps>("MistakeJournal");
      return (
        <MistakeJournal
          t={t}
          onGoToChat={goToChat}
          onGoToDashboard={() => setTab("dashboard")}
        />
      );
    }
    // Both ids route to the same screen — `schedule` is legacy and unreachable
    // from AppNav (audit finding #19); kept until the nav registry is unified.
    case "schedule":
    case "calendar": {
      const CalendarHub = legacyComponent<AnyProps>("CalendarHub");
      return <CalendarHub t={t} onGoToExams={() => setTab("exams")} />;
    }
    case "exams": {
      const Exams = legacyComponent<AnyProps>("Exams");
      return <Exams t={t} onPlanReady={(newExams: ExamLike[]) => goPlanning(newExams)} />;
    }
    case "progress": {
      const Progress = legacyComponent<AnyProps>("Progress");
      return <Progress t={t} />;
    }
    case "settings": {
      const Settings = legacyComponent<AnyProps>("Settings");
      return (
        <Settings
          t={t}
          lang={lang}
          onLangChange={setLang}
          onLogout={() => setRoute("landing")}
        />
      );
    }
    default: {
      const Dashboard = legacyComponent<AnyProps>("Dashboard");
      return (
        <Dashboard
          onOpenCourse={() => {}}
          onGoToChat={goToChat}
          onGoToExams={() => setTab("exams")}
          onGoToSchedule={() => setTab("schedule")}
          t={t}
        />
      );
    }
  }
}
