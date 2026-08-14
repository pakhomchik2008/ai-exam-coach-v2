// GMAT Focus Edition (the current GMAT).
//
// One tree, three official equally weighted sections. Titles follow GMAC
// published question types — not a licensed Official Practice Exam bank
// (Decision Log #37).
//
// Focus dropped AWA, Sentence Correction, and Quant geometry. Data
// Sufficiency lives in Data Insights, not Quant.

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

const GMAT: LearnTree = {
  examTaxonomy: "gmat",
  units: [
    unit("gq", "Quantitative Reasoning", "Quant", [
      node("gq-01", "Arithmetic and number properties", "Арифметика", 3, 10),
      node("gq-02", "Fractions, ratios, percents", "Дроби, відношення, відсотки", 3, 10, ["gq-01"]),
      node("gq-03", "Algebra: equations and inequalities", "Алгебра: рівняння й нерівності", 4, 12, ["gq-01"]),
      node("gq-04", "Exponents, roots, and functions", "Степені, корені, функції", 4, 11, ["gq-03"]),
      node("gq-05", "Word problems and rates", "Текстові задачі", 4, 12, ["gq-02", "gq-03"]),
      node("gq-06", "Problem Solving tactics", "Problem Solving", 4, 11, ["gq-03"]),
      node("gq-07", "Pacing: 21 questions / 45 minutes", "Темп Quant", 3, 8, ["gq-06"]),
    ]),
    unit("gv", "Verbal Reasoning", "Verbal", [
      node("gv-01", "Reading Comprehension: main idea", "Reading: головна думка", 3, 10),
      node("gv-02", "Reading Comprehension: detail and inference", "Reading: деталі й висновки", 4, 12, ["gv-01"]),
      node("gv-03", "Reading Comprehension: structure and tone", "Reading: структура й тон", 4, 11, ["gv-01"]),
      node("gv-04", "Critical Reasoning: assumption", "CR: припущення", 4, 12),
      node("gv-05", "Critical Reasoning: strengthen and weaken", "CR: посилити / послабити", 4, 12, ["gv-04"]),
      node("gv-06", "Critical Reasoning: evaluate and flaw", "CR: оцінка й помилка", 5, 12, ["gv-04"]),
      node("gv-07", "Pacing: 23 questions / 45 minutes", "Темп Verbal", 3, 8, ["gv-02", "gv-05"]),
    ]),
    unit("gd", "Data Insights", "Data Insights", [
      node("gd-01", "Data Sufficiency", "Data Sufficiency", 5, 14),
      node("gd-02", "Multi-Source Reasoning", "Multi-Source Reasoning", 5, 13, ["gd-01"]),
      node("gd-03", "Table Analysis", "Table Analysis", 4, 11),
      node("gd-04", "Graphics Interpretation", "Graphics Interpretation", 4, 11, ["gd-03"]),
      node("gd-05", "Two-Part Analysis", "Two-Part Analysis", 4, 12, ["gd-01"]),
      node("gd-06", "On-screen calculator (DI only)", "Калькулятор тільки в DI", 2, 6),
      node("gd-07", "Pacing: 20 questions / 45 minutes", "Темп Data Insights", 3, 8, ["gd-01", "gd-03"]),
    ]),
  ],
};

export default GMAT;
