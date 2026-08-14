// PTE Academic (Pearson). One tree, four score-report skills.
//
// Titles are the 22 official item types, including the two speaking tasks
// added 7 Aug 2025 (Summarize Group Discussion, Respond to a Situation).
// Not a licensed Scored Practice Test (Decision Log #37). PTE Core / Home
// are different products.

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

const PTE: LearnTree = {
  examTaxonomy: "pte",
  units: [
    unit("ps", "Speaking", "Speaking", [
      node("ps-01", "Read Aloud", "Read Aloud", 3, 10),
      node("ps-02", "Repeat Sentence", "Repeat Sentence", 4, 11, ["ps-01"]),
      node("ps-03", "Describe Image", "Describe Image", 4, 12),
      node("ps-04", "Re-tell Lecture", "Re-tell Lecture", 5, 12, ["ps-03"]),
      node("ps-05", "Answer Short Question", "Answer Short Question", 2, 7),
      node("ps-06", "Summarize Group Discussion", "Summarize Group Discussion", 5, 13, ["ps-04"]),
      node("ps-07", "Respond to a Situation", "Respond to a Situation", 4, 11),
    ]),
    unit("pw", "Writing", "Writing", [
      node("pw-01", "Summarize Written Text", "Summarize Written Text", 4, 12),
      node("pw-02", "Write Essay", "Write Essay", 4, 14, ["pw-01"]),
    ]),
    unit("pr", "Reading", "Reading", [
      node("pr-01", "Reading: multiple choice (single)", "Reading: MCQ single", 3, 9),
      node("pr-02", "Reading: multiple choice (multiple)", "Reading: MCQ multiple", 4, 10, ["pr-01"]),
      node("pr-03", "Re-order Paragraphs", "Re-order Paragraphs", 4, 11),
      node("pr-04", "Reading: Fill in the Blanks", "Reading: Fill in the Blanks", 3, 10),
      node("pr-05", "Reading & Writing: Fill in the Blanks", "Reading & Writing: Fill in the Blanks", 4, 11, ["pr-04"]),
    ]),
    unit("pl", "Listening", "Listening", [
      node("pl-01", "Summarize Spoken Text", "Summarize Spoken Text", 5, 13),
      node("pl-02", "Listening: multiple choice (single)", "Listening: MCQ single", 3, 9),
      node("pl-03", "Listening: multiple choice (multiple)", "Listening: MCQ multiple", 4, 10, ["pl-02"]),
      node("pl-04", "Listening: Fill in the Blanks", "Listening: Fill in the Blanks", 3, 10),
      node("pl-05", "Highlight Correct Summary", "Highlight Correct Summary", 4, 11),
      node("pl-06", "Select Missing Word", "Select Missing Word", 3, 8),
      node("pl-07", "Highlight Incorrect Words", "Highlight Incorrect Words", 4, 10),
      node("pl-08", "Write from Dictation", "Write from Dictation", 4, 11, ["pl-04"]),
    ]),
  ],
};

export default PTE;
