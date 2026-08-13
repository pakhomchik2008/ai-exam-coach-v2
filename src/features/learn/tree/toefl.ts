// TOEFL iBT — ETS official task types (ets.org/toefl, updated 2026 overview).
// Speaking uses the same Whisper path as IELTS (Phase 3.7g).

import { tree, unit } from "./build-tree";
import type { LearnTree } from "./schema";

const TOEFL: LearnTree = tree("toefl", [
  unit("tf-read", "Reading", "Читання", [
    "Complete the Words", "Read in Daily Life", "Read an Academic Passage",
    "Vocabulary in context", "Main idea and detail",
  ]),
  unit("tf-list", "Listening", "Аудіювання", [
    "Listen and Choose a Response", "Listen to a Conversation",
    "Listen to an Announcement", "Listen to an Academic Talk",
  ]),
  unit("tf-write", "Writing", "Письмо", [
    "Build a Sentence", "Write an Email", "Write for an Academic Discussion",
  ]),
  unit("tf-speak", "Speaking", "Говоріння", [
    "Listen and Repeat", "Take an Interview", "Hold a Conversation",
  ]),
]);

export default TOEFL;
