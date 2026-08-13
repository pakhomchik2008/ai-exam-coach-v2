// Which Learn method to highlight. Pure — the picker just badges a card.

export type LearnMethod = "theory" | "flashcards" | "socratic" | "fading" | "feynman";

export function recommendLearnMethod(opts: {
  firstVisit: boolean;
  drillAccuracy?: number | null;
  saidConfused?: boolean;
  beforeProve?: boolean;
  afterSilver?: boolean;
}): LearnMethod {
  if (opts.saidConfused) return "socratic";
  if (opts.afterSilver) return "feynman";
  if (opts.beforeProve) return "flashcards";
  if (typeof opts.drillAccuracy === "number" && opts.drillAccuracy < 0.5) return "fading";
  if (opts.firstVisit) return "theory";
  return "theory";
}
