/**
 * Horizontal product reel. Vertical scroll drives translateX on desktop
 * so the page never hijacks the wheel; mobile is native snap. Four
 * surfaces Hlib named: chat, Learn, geometry, calendar.
 */
import React from "react";
import { LearnScreen } from "./LearnScreen";
import { OrbitField } from "./OrbitField";
import { PredictorChart } from "./PredictorChart";

export const REEL_PANELS = ["chat", "learn", "geo", "cal"] as const;

type FeatureReelProps = {
  t: Record<string, string>;
  lang: string;
  actions: React.ReactNode;
};

function useReelProgress() {
  const ref = React.useRef<HTMLElement | null>(null);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = window.matchMedia("(max-width: 860px)");

    function measure() {
      const node = ref.current;
      if (!node || reduce.matches || narrow.matches) {
        setProgress(0);
        return;
      }
      const total = node.offsetHeight - window.innerHeight;
      const scrolled = -node.getBoundingClientRect().top;
      setProgress(Math.min(1, Math.max(0, scrolled / Math.max(1, total))));
    }

    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    reduce.addEventListener("change", measure);
    narrow.addEventListener("change", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      reduce.removeEventListener("change", measure);
      narrow.removeEventListener("change", measure);
    };
  }, []);

  function goTo(index: number) {
    const el = ref.current;
    if (!el) return;
    const track = el.querySelector(".land-reel-track");
    const panel = track?.children[index];
    if (window.matchMedia("(max-width: 860px)").matches && panel instanceof HTMLElement) {
      panel.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      return;
    }
    const last = REEL_PANELS.length - 1;
    const total = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY + (index / last) * Math.max(1, total);
    window.scrollTo({ top, behavior: "smooth" });
  }

  return { ref, progress, goTo };
}

function ChatMock({ t }: { t: Record<string, string> }) {
  return (
    <div className="land-reel-chat">
      <p className="land-bubble land-bubble-me">{t.land_reel_chat_me}</p>
      <p className="land-bubble land-bubble-ai">{t.land_reel_chat_ai}</p>
    </div>
  );
}

function CalendarMock({ t }: { t: Record<string, string> }) {
  const days = (t.land_reel_cal_days ?? "Mon·Tue·Wed·Thu·Fri·Sat·Sun").split("·");
  const load = [0, 2, 0, 1, 3, 0, 4];
  return (
    <div className="land-cal">
      <ol>
        {days.map((day, i) => {
          const hours = load[i] ?? 0;
          return (
            <li key={day} className={hours === 4 ? "is-exam" : hours > 0 ? "is-on" : ""}>
              <b>{day.trim()}</b>
              <span>{hours === 4 ? t.land_reel_cal_exam : hours ? `${hours}h` : "—"}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function FeatureReel({ t, lang, actions }: FeatureReelProps) {
  const { ref, progress, goTo } = useReelProgress();
  const active = Math.min(REEL_PANELS.length - 1, Math.round(progress * (REEL_PANELS.length - 1)));

  return (
    <section
      className="land-reel"
      id="features"
      ref={ref}
      style={{ "--reel": progress } as React.CSSProperties}
      aria-labelledby="land-reel-title"
    >
      <div className="land-reel-sticky">
        <div className="land-reel-copy">
          <h2 id="land-reel-title">{t.land_reel_title}</h2>
          <p className="land-lede">{t.land_reel_sub}</p>
          {actions}
        </div>
        <div className="land-reel-viewport">
          <div className="land-reel-track">
            <article className="land-reel-panel">
              <p className="land-scene-kicker">{t.land_reel_chat_title}</p>
              <p>{t.land_reel_chat_body}</p>
              <ChatMock t={t} />
            </article>
            <article className="land-reel-panel">
              <p className="land-scene-kicker">{t.land_reel_learn_title}</p>
              <p>{t.land_reel_learn_body}</p>
              <LearnScreen lang={lang} />
            </article>
            <article className="land-reel-panel">
              <p className="land-scene-kicker">{t.land_reel_geo_title}</p>
              <p>{t.land_reel_geo_body}</p>
              <OrbitField>
                <PredictorChart nowLabel={t.land_hero_now ?? ""} predLabel={t.land_hero_pred ?? ""} />
              </OrbitField>
            </article>
            <article className="land-reel-panel">
              <p className="land-scene-kicker">{t.land_reel_cal_title}</p>
              <p>{t.land_reel_cal_body}</p>
              <CalendarMock t={t} />
            </article>
          </div>
        </div>
        <div className="land-reel-dots" role="tablist" aria-label={t.land_reel_title}>
          {REEL_PANELS.map((id, i) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active === i}
              className={active === i ? "is-on" : ""}
              onClick={() => goTo(i)}
            >
              {t[`land_reel_${id}_title`]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
