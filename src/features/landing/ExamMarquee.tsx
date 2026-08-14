/**
 * Infinite exam strip under the hero fold.
 * Duplicated track + translateX(-50%) — same mechanic Cursor/Vercel use
 * for logo rows. Names are the product set plus the boards Hlib listed.
 */

export type ExamChip = {
  id: string;
  mark: string;
  name: string;
};

export const EXAM_CHIPS: readonly ExamChip[] = [
  { id: "nmt", mark: "НМ", name: "НМТ" },
  { id: "zno", mark: "ЗН", name: "ЗНО" },
  { id: "ielts", mark: "IE", name: "IELTS" },
  { id: "sat", mark: "SA", name: "SAT" },
  { id: "gcse", mark: "GC", name: "GCSE" },
  { id: "toefl", mark: "TO", name: "TOEFL" },
  { id: "act", mark: "AC", name: "ACT" },
  { id: "ap", mark: "AP", name: "AP" },
  { id: "abitur", mark: "AB", name: "Abitur" },
  { id: "bac", mark: "BA", name: "Bac" },
  { id: "gre", mark: "GR", name: "GRE" },
  { id: "duolingo", mark: "DU", name: "Duolingo" },
  { id: "matura", mark: "MA", name: "Matura" },
  { id: "alevel", mark: "AL", name: "A-Level" },
  { id: "ib", mark: "IB", name: "IB" },
];

type ExamMarqueeProps = {
  label: string;
};

function Row({ chips, hidden }: { chips: readonly ExamChip[]; hidden?: boolean }) {
  return (
    <ul className="land-marquee-row" aria-hidden={hidden ? true : undefined}>
      {chips.map((exam) => (
        <li key={`${hidden ? "b" : "a"}-${exam.id}`} className="land-exam">
          <span className="land-exam-mark" aria-hidden="true">{exam.mark}</span>
          <span>{exam.name}</span>
        </li>
      ))}
    </ul>
  );
}

export function ExamMarquee({ label }: ExamMarqueeProps) {
  return (
    <div className="land-marquee" aria-label={label}>
      <div className="land-marquee-track">
        <Row chips={EXAM_CHIPS} />
        <Row chips={EXAM_CHIPS} hidden />
      </div>
    </div>
  );
}
