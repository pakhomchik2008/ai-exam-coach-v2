// Digital SAT — one sitting, two sections. Topic titles are College Board
// Digital SAT Suite domains (curriculum-data.jsx, specVersion digital-2024).
// One tree on purpose: students add "SAT", not two exams.

import { tree, unit } from "./build-tree";
import type { LearnTree } from "./schema";

const SAT: LearnTree = tree("sat", [
  unit("sat-rw", "Reading and Writing", "Читання і письмо", [
    "Central Ideas and Details", "Inferences", "Command of Evidence", "Words in Context",
    "Text Structure and Purpose", "Cross-Text Connections", "Rhetorical Synthesis",
    "Transitions", "Sentence Boundaries", "Form, Structure and Sense", "Punctuation",
    "Sentence Structure",
  ]),
  unit("sat-math", "Mathematics", "Математика", [
    "Linear Equations", "Linear Functions", "Systems of Equations", "Linear Inequalities",
    "Equivalent Expressions", "Quadratic Equations", "Quadratic Functions",
    "Polynomial Functions", "Exponential Functions", "One-Variable Data",
    "Two-Variable Data", "Statistics", "Financial Literacy", "Trigonometry", "Circles",
  ]),
]);

export default SAT;
