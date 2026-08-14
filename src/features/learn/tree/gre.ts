// GRE General Test (shorter GRE, Sept 2023+).
//
// One tree, three official measures: Verbal, Quantitative, Analytical
// Writing. Titles follow ETS published question types and math content
// areas — not a licensed PowerPrep item bank (Decision Log #37).
// Analyze an Argument was dropped; AWA is Issue only.

import type { LearnNode, LearnTree, LearnUnit } from "./schema";

function node(
  id: string,
  en: string,
  uk: string,
  complexity: 1 | 2 | 3 | 4 | 5,
  minutes: number,
  prerequisites: readonly string[] = [],
): LearnNode {
  return { id, title: { en, uk }, complexity, estimatedMinutes: minutes, prerequisites };
}

function unit(id: string, en: string, uk: string, nodes: readonly LearnNode[]): LearnUnit {
  return { id, title: { en, uk }, nodes };
}

const GRE: LearnTree = {
  examTaxonomy: "gre",
  units: [
    unit("gv", "Verbal Reasoning", "Verbal", [
      node("gv-01", "Text Completion (one blank)", "Text Completion: одна прогалина", 3, 10),
      node("gv-02", "Text Completion (two and three blanks)", "Text Completion: 2–3 прогалини", 4, 12, ["gv-01"]),
      node("gv-03", "Sentence Equivalence", "Sentence Equivalence", 4, 11, ["gv-01"]),
      node("gv-04", "Reading Comprehension: main idea", "Reading: головна думка", 3, 10),
      node("gv-05", "Reading Comprehension: detail and inference", "Reading: деталі й висновки", 4, 12, ["gv-04"]),
      node("gv-06", "Author's purpose, tone, structure", "Мета автора, тон, структура", 4, 11, ["gv-04"]),
      node("gv-07", "Vocabulary in context", "Слово в контексті", 3, 9, ["gv-01"]),
      node("gv-08", "Argument in a short passage", "Аргумент у короткому тексті", 5, 12, ["gv-05"]),
      node("gv-09", "Pacing: 27 questions / 41 minutes", "Темп Verbal", 3, 8, ["gv-02", "gv-05"]),
    ]),
    unit("gq", "Quantitative Reasoning", "Quant", [
      node("gq-01", "Arithmetic and number properties", "Арифметика", 3, 10),
      node("gq-02", "Algebra: equations and inequalities", "Алгебра: рівняння й нерівності", 3, 11, ["gq-01"]),
      node("gq-03", "Algebra: functions and exponents", "Алгебра: функції й степені", 4, 12, ["gq-02"]),
      node("gq-04", "Geometry: plane and coordinate", "Геометрія", 4, 12, ["gq-01"]),
      node("gq-05", "Data analysis and statistics", "Дані й статистика", 4, 12, ["gq-01"]),
      node("gq-06", "Quantitative Comparison", "Quantitative Comparison", 4, 12, ["gq-02"]),
      node("gq-07", "Numeric Entry", "Numeric Entry", 3, 10, ["gq-02"]),
      node("gq-08", "Data Interpretation sets", "Набори з графіками", 4, 12, ["gq-05"]),
      node("gq-09", "Word problems and rates", "Текстові задачі", 4, 11, ["gq-02"]),
      node("gq-10", "Pacing: 27 questions / 47 minutes", "Темп Quant", 3, 8, ["gq-06", "gq-07"]),
    ]),
    unit("ga", "Analytical Writing", "AWA", [
      node("ga-01", "Issue task: take a position", "Issue: позиція", 3, 10),
      node("ga-02", "Issue: reasons and examples", "Issue: аргументи й приклади", 4, 12, ["ga-01"]),
      node("ga-03", "Organization and transitions", "Структура й зв'язки", 3, 10, ["ga-01"]),
      node("ga-04", "Standard written English", "Писемна англійська", 3, 9),
      node("ga-05", "The 0–6 scoring scale", "Шкала 0–6", 3, 8, ["ga-01"]),
      node("ga-06", "30-minute Issue timing", "30 хвилин на Issue", 2, 7, ["ga-02"]),
    ]),
  ],
};

export default GRE;
