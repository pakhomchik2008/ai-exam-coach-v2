/**
 * Four real product surfaces, stacked. No horizontal swipe —
 * Hlib killed the predictor card and the left-slide track.
 */
import React from "react";
import { JournalScreen } from "./JournalScreen";
import { LearnScreen } from "./LearnScreen";

export const REEL_PANELS = ["chat", "learn", "journal", "cal"] as const;

type FeatureReelProps = {
  t: Record<string, string>;
  lang: string;
  actions: React.ReactNode;
};

function ChatMock({ t }: { t: Record<string, string> }) {
  return (
    <div className="land-reel-chat">
      <p className="land-bubble land-bubble-me">{t.land_reel_chat_me}</p>
      <p className="land-bubble land-bubble-ai">{t.land_reel_chat_ai}</p>
    </div>
  );
}

const CAL_START = 16;
const CAL_HOURS = [16, 17, 18, 19, 20];
const CAL_BLOCKS: { day: number; start: number; dur: number; title: Record<string, string>; kind: "study" | "review" | "exam" | "personal" }[] = [
  { day: 0, start: 17, dur: 1, kind: "study", title: { en: "Quadratics", uk: "Квадратні", ru: "Квадратные", fr: "Quadratiques", de: "Quadratische" } },
  { day: 1, start: 16.5, dur: 1.5, kind: "study", title: { en: "IELTS Reading", uk: "IELTS Reading", ru: "IELTS Reading", fr: "IELTS Reading", de: "IELTS Reading" } },
  { day: 2, start: 18, dur: 0.75, kind: "review", title: { en: "Mistake review", uk: "Розбір помилок", ru: "Разбор ошибок", fr: "Revue d’erreurs", de: "Fehlerreview" } },
  { day: 3, start: 17, dur: 1, kind: "study", title: { en: "NMT Math", uk: "НМТ математика", ru: "НМТ математика", fr: "NMT maths", de: "NMT Mathe" } },
  { day: 4, start: 16, dur: 1, kind: "study", title: { en: "Speaking", uk: "Speaking", ru: "Speaking", fr: "Speaking", de: "Speaking" } },
  { day: 5, start: 16, dur: 2, kind: "exam", title: { en: "IELTS mock", uk: "IELTS мок", ru: "IELTS мок", fr: "IELTS blanc", de: "IELTS-Mock" } },
  { day: 6, start: 18, dur: 1, kind: "personal", title: { en: "Gym", uk: "Зал", ru: "Зал", fr: "Salle", de: "Studio" } },
];

function CalendarMock({ t, lang }: { t: Record<string, string>; lang: string }) {
  const days = (t.land_reel_cal_days ?? "Mon·Tue·Wed·Thu·Fri·Sat·Sun").split("·");
  const today = new Date().getDay();
  const todayIdx = today === 0 ? 6 : today - 1;
  const loc = ["en", "uk", "ru", "fr", "de"].includes(lang) ? lang : "en";
  const hourPx = 28;

  return (
    <div className="land-cal" aria-hidden="true">
      <div className="land-cal-head">
        <span />
        {days.map((day, i) => (
          <b key={day} className={i === todayIdx ? "is-today" : undefined}>{day.trim()}</b>
        ))}
      </div>
      <div className="land-cal-grid" style={{ height: CAL_HOURS.length * hourPx }}>
        <div className="land-cal-times">
          {CAL_HOURS.map((h) => (
                    <span key={h} style={{ top: (h - CAL_START) * hourPx }}>{`${String(h).padStart(2, "0")}:00`}</span>
          ))}
        </div>
        {days.map((day, dayIdx) => (
          <div key={day} className={`land-cal-col${dayIdx === todayIdx ? " is-today" : ""}`}>
            {CAL_HOURS.map((h) => (
              <i key={h} style={{ top: (h - CAL_START) * hourPx }} />
            ))}
            {CAL_BLOCKS.filter((b) => b.day === dayIdx).map((b) => (
              <em
                key={`${b.day}-${b.start}`}
                className={`is-${b.kind}`}
                style={{
                  top: (b.start - CAL_START) * hourPx + 2,
                  height: b.dur * hourPx - 4,
                }}
              >
                {b.title[loc] ?? b.title.en}
              </em>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeatureReel({ t, lang, actions }: FeatureReelProps) {
  const rows: { id: typeof REEL_PANELS[number]; mock: React.ReactNode }[] = [
    { id: "chat", mock: <ChatMock t={t} /> },
    { id: "learn", mock: <LearnScreen lang={lang} /> },
    { id: "journal", mock: <JournalScreen lang={lang} /> },
    { id: "cal", mock: <CalendarMock t={t} lang={lang} /> },
  ];

  return (
    <section className="land-reel" id="features" aria-labelledby="land-reel-title">
      <div className="land-wrap land-reel-head">
        <h2 id="land-reel-title">{t.land_reel_title}</h2>
        <p className="land-lede">{t.land_reel_sub}</p>
        {actions}
      </div>
      <div className="land-reel-stack">
        {rows.map((row, i) => (
          <article key={row.id} className={`land-reel-row${i % 2 ? " is-flip" : ""}`}>
            <div>
              <p className="land-scene-kicker">{t[`land_reel_${row.id}_title`]}</p>
              <p>{t[`land_reel_${row.id}_body`]}</p>
            </div>
            <div className="land-reel-stage">{row.mock}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
