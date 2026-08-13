// TOEFL iBT — ETS official task types (ets.org/toefl, updated 2026 overview).
// Speaking omitted: no mic / Whisper path (same as IELTS, Decision Log #39).

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
]);

export default TOEFL;
