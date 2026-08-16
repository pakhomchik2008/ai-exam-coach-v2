/**
 * Infinite exam strip under the hero fold.
 * Duplicated track + translateX(-50%) — same mechanic Cursor/Vercel use
 * for logo rows. Only live Learn trees. Other boards are Coach chat —
 * listing them here sold a syllabus we do not have.
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
