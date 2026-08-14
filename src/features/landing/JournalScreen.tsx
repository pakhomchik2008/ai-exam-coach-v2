/**
 * Marketing stand-in for Mistake Journal.
 * Same chrome as the real tab: recovery rate, due-today, three cards.
 */

type JournalScreenProps = {
  lang: string;
};

const COPY: Record<string, {
  title: string;
  recovery: string;
  pending: string;
  due: string;
  rows: { tone: "high" | "medium" | "low"; topic: string; detail: string }[];
}> = {
  uk: {
    title: "Журнал помилок",
    recovery: "62% відновлено",
    pending: "5 на сьогодні",
    due: "24 записи",
    rows: [
      { tone: "high", topic: "Квадратні рівняння", detail: "Знак перед дискримінантом · 3 рази" },
      { tone: "medium", topic: "IELTS Reading", detail: "True / False / Not Given · 2 рази" },
      { tone: "low", topic: "Past simple", detail: "Відновлено після Drill" },
    ],
  },
  en: {
    title: "Mistake Journal",
    recovery: "62% recovered",
    pending: "5 due today",
    due: "24 logged",
    rows: [
      { tone: "high", topic: "Quadratics", detail: "Sign before the discriminant · 3 times" },
      { tone: "medium", topic: "IELTS Reading", detail: "True / False / Not Given · 2 times" },
      { tone: "low", topic: "Past simple", detail: "Recovered after Drill" },
    ],
  },
  ru: {
    title: "Журнал ошибок",
    recovery: "62% восстановлено",
    pending: "5 на сегодня",
    due: "24 записи",
    rows: [
      { tone: "high", topic: "Квадратные уравнения", detail: "Знак перед дискриминантом · 3 раза" },
      { tone: "medium", topic: "IELTS Reading", detail: "True / False / Not Given · 2 раза" },
      { tone: "low", topic: "Past simple", detail: "Восстановлено после Drill" },
    ],
  },
  fr: {
    title: "Journal d’erreurs",
    recovery: "62 % récupéré",
    pending: "5 pour aujourd’hui",
    due: "24 fiches",
    rows: [
      { tone: "high", topic: "Quadratiques", detail: "Signe devant le discriminant · 3 fois" },
      { tone: "medium", topic: "IELTS Reading", detail: "True / False / Not Given · 2 fois" },
      { tone: "low", topic: "Past simple", detail: "Récupéré après Drill" },
    ],
  },
  de: {
    title: "Fehlerjournal",
    recovery: "62 % behoben",
    pending: "5 heute fällig",
    due: "24 Einträge",
    rows: [
      { tone: "high", topic: "Quadratische", detail: "Vorzeichen vor der Diskriminante · 3×" },
      { tone: "medium", topic: "IELTS Reading", detail: "True / False / Not Given · 2×" },
      { tone: "low", topic: "Past simple", detail: "Nach Drill behoben" },
    ],
  },
};

export function JournalScreen({ lang }: JournalScreenProps) {
  const copy = COPY[lang] ?? COPY.en;
  if (!copy) return null;
  return (
    <div className="land-journal" aria-hidden="true">
      <header className="land-journal-head">
        <p className="land-learn-kicker">Exam Coach</p>
        <h3>{copy.title}</h3>
        <ul className="land-journal-stats">
          <li>{copy.due}</li>
          <li>{copy.recovery}</li>
          <li>{copy.pending}</li>
        </ul>
      </header>
      <ul className="land-journal-rows">
        {copy.rows.map((row) => (
          <li key={row.topic} className={`is-${row.tone}`}>
            <b>{row.topic}</b>
            <span>{row.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
