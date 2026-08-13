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
import { remountKeyFor, isTrackedKey } from "./data-version";
import { QuickOnboarding } from "../features/onboarding/QuickOnboarding";

type AnyProps = Record<string, unknown>;
type Dict = Record<string, string>;
type Tweaks = { accent: string; density: string; depth: string };

type Route = "landing" | "onboarding" | "planning" | "app";

interface ExamLike {
  id: string;
}

// Resolved once, at module scope, so each has a stable component identity and
// React never remounts a subtree just because App re-rendered. Each one is a
// conversion to-do: when its module becomes a real ES module, import it here
// instead and delete the line.
const Landing = legacyComponent<AnyProps>("Landing");
const AIPlan = legacyComponent<AnyProps>("AIPlan");
const AppNav = legacyComponent<AnyProps>("AppNav");
const StudyLayer = legacyComponent<AnyProps>("StudyLayer");
const TweaksPanel = legacyComponent<AnyProps>("TweaksPanel");
const TweakSection = legacyComponent<AnyProps>("TweakSection");
const TweakRadio = legacyComponent<AnyProps>("TweakRadio");
const AIChat = legacyComponent<AnyProps>("AIChat");
const StudyHub = legacyComponent<AnyProps>("StudyHub");
const LearnMain = legacyComponent<AnyProps>("LearnMain");
const MistakeJournal = legacyComponent<AnyProps>("MistakeJournal");
const CalendarHub = legacyComponent<AnyProps>("CalendarHub");
const Exams = legacyComponent<AnyProps>("Exams");
const Progress = legacyComponent<AnyProps>("Progress");
const Settings = legacyComponent<AnyProps>("Settings");
const Dashboard = legacyComponent<AnyProps>("Dashboard");

export function App() {
  const useTweaks = legacyFn<(d: typeof TWEAK_DEFAULTS) => [Tweaks, (k: string, v: string) => void]>(
    "useTweaks",
  );
  const getSession = legacyFn<() => unknown>("getSession");
  const getProfile = legacyFn<() => Dict>("getProfile");
  const saveProfile = legacyFn<(patch: Dict) => void>("saveProfile");
  const hasProfile = legacyFn<() => boolean>("hasProfile");
  const clearSession = legacyFn<() => void>("clearSession");

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

  // Bumped whenever this student's data changes underneath a mounted screen —
  // from another tab (localStorage's native `storage` event) or, since Phase 2c,
  // from another device (the sync layer dispatches the same event after a pull,
  // deliberately reusing this one listener rather than adding a second
  // reactivity path). Feeds the content `key` below; see ./data-version.ts for
  // which screens that remounts and which it must not.
  const [dataVersion, setDataVersion] = React.useState(0);

  // Re-apply CSS overrides whenever a tweak changes.
  React.useEffect(() => {
    applyTweaks(tw.accent, tw.density, tw.depth);
  }, [tw.accent, tw.density, tw.depth]);

  React.useEffect(() => {
    const sessionKey = legacyOptional<string>("SESSION_KEY");
    // PERSONAL_DATA_KEYS is the same list the sync layer syncs and logout
    // clears, so a key can never be added to one and forgotten in the others.
    // The hand-maintained list of seven that used to live here had exactly that
    // problem: it never gained the brain/mastery/XP keys, so those changes were
    // ignored (audit #28).
    const trackedKeys = [
      ...(legacyOptional<string[]>("PERSONAL_DATA_KEYS") ?? []),
      ...(sessionKey ? [sessionKey] : []),
    ];

    const onStorage = (e: StorageEvent) => {
      if (!isTrackedKey(e.key, trackedKeys)) return;
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
    return <Landing onContinue={goAfterAuth} t={t} lang={lang} onLangChange={setLang} />;
  }
  if (route === "onboarding") {
    // QuickOnboarding (Phase 3 §3d) replaces the ExamWizard-based `Onboarding`
    // here. It ends on its own plan preview rather than routing to AIPlan, so
    // onFinish lands straight on the dashboard — the preview already showed
    // the student what was built, and AIPlan's 6.4s animation on top of that
    // would just be the same information a second time, slower.
    return <QuickOnboarding onFinish={goApp} lang={lang} onLangChange={setLang} />;
  }
  if (route === "planning") {
    return <AIPlan examIds={planExamIds} onStart={goApp} t={t} />;
  }


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
        // Bug (audit #29): this button used to call only setRoute("landing"),
        // never window.clearSession() — unlike Settings.jsx's own logout button,
        // which does call it. On a shared device (school computer), the header
        // "Log out" button left the Supabase session AND every personal
        // localStorage key (exams, mastery, mistakes, chat caches) in place for
        // the next person. clearSession() now also wipes that data — see
        // PERSONAL_DATA_KEYS in auth-store.jsx.
        onLogout={() => {
          clearSession();
          setRoute("landing");
        }}
        lang={lang}
        onLangChange={setLang}
      />

      {/* Audit #28. The remount is on the tab content, NOT on <main> or the
          whole tree: StudyLayer below holds a running study session with a live
          timer, and remounting that on a background sync would drop the
          student's session. remountKeyFor also pins the tabs that hold unsaved
          input — see ./data-version.ts. */}
      <main
        style={{
          maxWidth: "var(--container-app)",
          margin: "0 auto",
          padding: "var(--space-8) var(--space-4)",
        }}
      >
        {/* Keyed wrapper: changing the key discards the subtree so legacy
            screens re-read localStorage. ux-page is a short fade+rise on tab
            switch; dataVersion only bumps on other-tab storage events. */}
        <div className="ux-page" key={remountKeyFor(tab, dataVersion)}>{content}</div>
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
      return <AIChat t={t} initialQuery={chatQuery} onConsumeQuery={() => setChatQuery(null)} />;
    }
    case "study": {
      // Phase 3.7a — Learn section. NMT is per-subject (language ≠ math).
      // StudyHub stays available on
      // /studyhub for one release as a rollback path if LearnMain
      // regresses something in production.
      return <LearnMain t={t} />;
    }
    case "studyhub": {
      return <StudyHub t={t} />;
    }
    case "journal": {
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
      return <CalendarHub t={t} onGoToExams={() => setTab("exams")} />;
    }
    case "exams": {
      return <Exams t={t} onPlanReady={(newExams: ExamLike[]) => goPlanning(newExams)} />;
    }
    case "progress": {
      return <Progress t={t} />;
    }
    case "settings": {
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
