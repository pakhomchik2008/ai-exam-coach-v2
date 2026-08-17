/**
 * Exam strip under the hero. DC lists the onboarding boards;
 * hero copy already says only NMT / IELTS have a live tree.
 */
export type ExamChip = {
  id: string;
  name: string;
  live?: boolean;
};

export const EXAM_CHIPS: readonly ExamChip[] = [
  { id: "nmt", name: "NMT", live: true },
  { id: "ielts", name: "IELTS", live: true },
  { id: "toefl", name: "TOEFL" },
  { id: "duolingo", name: "Duolingo" },
  { id: "pte", name: "PTE" },
  { id: "sat", name: "SAT" },
  { id: "act", name: "ACT" },
  { id: "ap", name: "AP" },
  { id: "ib", name: "IB" },
  { id: "gcse", name: "GCSE" },
  { id: "alevel", name: "A-Level" },
  { id: "matura", name: "Matura" },
  { id: "abitur", name: "Abitur" },
  { id: "bac", name: "Bac" },
  { id: "gre", name: "GRE" },
  { id: "gmat", name: "GMAT" },
];

type ExamMarqueeProps = {
  label: string;
};

function Row({ chips, hidden }: { chips: readonly ExamChip[]; hidden?: boolean }) {
  return (
    <ul className="land-marquee-row" aria-hidden={hidden ? true : undefined}>
      {chips.map((exam) => (
        <li key={`${hidden ? "b" : "a"}-${exam.id}`} className={`land-exam${exam.live && exam.id === "ielts" ? " is-live" : ""}`}>
          <span>{exam.name}</span>
        </li>
      ))}
    </ul>
  );
}

export function ExamMarquee({ label }: ExamMarqueeProps) {
  return (
    <div className="land-marquee" aria-label={label}>
      <span className="land-marquee-label">{label}</span>
      <div style={{ flex: 1, overflow: "hidden", maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)" }}>
        <div className="land-marquee-track">
          <Row chips={EXAM_CHIPS} />
          <Row chips={EXAM_CHIPS} hidden />
        </div>
      </div>
    </div>
  );
}
