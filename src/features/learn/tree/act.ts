// ACT — one composite sitting. Topic titles from curriculum-data.jsx
// (ACT, Inc. 2024 section domains). Writing optional is omitted.

import { tree, unit } from "./build-tree";
import type { LearnTree } from "./schema";

const ACT: LearnTree = tree("act", [
  unit("act-eng", "English", "English", [
    "Topic Development", "Organization", "Style", "Sentence Structure", "Grammar", "Punctuation",
  ]),
  unit("act-math", "Mathematics", "Математика", [
    "Pre-Algebra", "Elementary Algebra", "Intermediate Algebra",
    "Coordinate Geometry", "Plane Geometry", "Trigonometry",
  ]),
  unit("act-read", "Reading", "Читання", [
    "Key Ideas and Details", "Craft and Structure",
    "Integration of Knowledge and Ideas", "Passage Types",
  ]),
  unit("act-sci", "Science", "Наука", [
    "Data Representation", "Research Summaries", "Conflicting Viewpoints",
  ]),
]);

export default ACT;
