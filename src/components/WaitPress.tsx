/**
 * Long AI-wait scene. Exam generation can sit 30s+ — three dots feel
 * dead. This prints a fake paper so the wait reads as work, not a hang.
 */
import { usePrefersReducedMotion } from "../lib/motion-runtime";

const BEATS = {
  en: ["Picking topics", "Writing item 1", "Writing item 2", "Checking novelty", "Stapling the paper"],
  uk: ["Обираю теми", "Пишу питання 1", "Пишу питання 2", "Перевіряю новизну", "Зшиваю аркуш"],
  ru: ["Выбираю темы", "Пишу вопрос 1", "Пишу вопрос 2", "Проверяю новизну", "Сшиваю лист"],
  fr: ["Choix des sujets", "Rédaction 1", "Rédaction 2", "Contrôle nouveauté", "Assemblage"],
  de: ["Themen wählen", "Aufgabe 1", "Aufgabe 2", "Neuheit prüfen", "Heftung"],
} as const;

type BeatLang = keyof typeof BEATS;

function beatsFor(lang: string): readonly string[] {
  return lang in BEATS ? BEATS[lang as BeatLang] : BEATS.en;
}

export function WaitPress({
  title,
  subtitle,
  lang = "en",
  compact = false,
}: {
  title: string;
  subtitle?: string;
  lang?: string;
  compact?: boolean;
}) {
  const reduce = usePrefersReducedMotion();
  const beats = beatsFor(lang);

  return (
    <div
      className={compact ? "wait-press wait-press--compact" : "wait-press"}
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      <p className="wait-press-kicker">
        <i className="wait-press-live" />
        LIVE · PRESS
      </p>
      <h2>
        {title}
        {!reduce && <span className="wait-press-caret" aria-hidden="true" />}
      </h2>
      {subtitle && <p className="wait-press-sub">{subtitle}</p>}
      <div className="wait-press-sheet" aria-hidden="true">
        <span className="wait-press-stamp">DRAFT</span>
        <i className="wait-press-scan" />
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="wait-press-q" style={{ ["--q" as string]: n }}>
            <em>Q{n}</em>
            <span /><span />
          </div>
        ))}
      </div>
      {!reduce && (
        <ol className="wait-press-beats">
          {beats.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ol>
      )}
      <div className="wait-press-bar" aria-hidden="true"><i /></div>
    </div>
  );
}
