/**
 * Marketing stand-in for a real Learn screenshot.
 * We do not ship a PNG of the app — this is the medal-list chrome that
 * actually shipped in 3.7a. Frozen mock — no logged-in screenshot.
 * surface without photographing a logged-in session.
 */

type LearnScreenProps = {
  lang: string;
};

const COPY: Record<string, {
  title: string;
  progress: string;
  unitNm: string;
  unitAl: string;
  nodes: [string, "bronze" | "unlocked" | "locked"][];
}> = {
  uk: {
    title: "Навчання",
    progress: "12 із 47 тем · НМТ",
    unitNm: "Числа та вирази",
    unitAl: "Алгебра",
    nodes: [
      ["Натуральні числа", "bronze"],
      ["Дроби, відсотки", "bronze"],
      ["Пропорція", "unlocked"],
      ["Многочлени", "locked"],
      ["Квадратні рівняння", "locked"],
    ],
  },
  en: {
    title: "Learn",
    progress: "12 of 47 topics · NMT",
    unitNm: "Numbers & expressions",
    unitAl: "Algebra",
    nodes: [
      ["Natural numbers", "bronze"],
      ["Fractions, percentages", "bronze"],
      ["Ratio and proportion", "unlocked"],
      ["Polynomials", "locked"],
      ["Quadratic equations", "locked"],
    ],
  },
  ru: {
    title: "Обучение",
    progress: "12 из 47 тем · НМТ",
    unitNm: "Числа и выражения",
    unitAl: "Алгебра",
    nodes: [
      ["Натуральные числа", "bronze"],
      ["Дроби, проценты", "bronze"],
      ["Пропорция", "unlocked"],
      ["Многочлены", "locked"],
      ["Квадратные уравнения", "locked"],
    ],
  },
  fr: {
    title: "Apprendre",
    progress: "12 sur 47 sujets · NMT",
    unitNm: "Nombres et expressions",
    unitAl: "Algèbre",
    nodes: [
      ["Nombres naturels", "bronze"],
      ["Fractions, pourcentages", "bronze"],
      ["Proportion", "unlocked"],
      ["Polynômes", "locked"],
      ["Équations du second degré", "locked"],
    ],
  },
  de: {
    title: "Lernen",
    progress: "12 von 47 Themen · NMT",
    unitNm: "Zahlen und Ausdrücke",
    unitAl: "Algebra",
    nodes: [
      ["Natürliche Zahlen", "bronze"],
      ["Brüche, Prozent", "bronze"],
      ["Verhältnis", "unlocked"],
      ["Polynome", "locked"],
      ["Quadratische Gleichungen", "locked"],
    ],
  },
};

function Medal({ state }: { state: "bronze" | "unlocked" | "locked" }) {
  return <span className={`land-learn-medal is-${state}`} aria-hidden="true" />;
}

export function LearnScreen({ lang }: LearnScreenProps) {
  const copy = COPY[lang] ?? COPY.uk;
  if (!copy) return null;
  const first = copy.nodes.slice(0, 3);
  const rest = copy.nodes.slice(3);

  return (
    <div className="land-learn" aria-hidden="true">
      <header className="land-learn-head">
        <p className="land-learn-kicker">Examik</p>
        <h3>{copy.title}</h3>
        <p>{copy.progress}</p>
        <div className="land-learn-bar"><i /></div>
      </header>
      <p className="land-learn-unit">{copy.unitNm}</p>
      <ul>
        {first.map(([name, state]) => (
          <li key={name}>
            <Medal state={state} />
            <span>{name}</span>
          </li>
        ))}
      </ul>
      <p className="land-learn-unit">{copy.unitAl}</p>
      <ul>
        {rest.map(([name, state]) => (
          <li key={name}>
            <Medal state={state} />
            <span>{name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
