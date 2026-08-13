// Duolingo English Test — official integrated subscores + published item
// types (englishtest.duolingo.com, July 2024 subscore update). Conversation
// / Production speaking items stay as theory nodes — no mic path.

import { tree, unit } from "./build-tree";
import type { LearnTree } from "./schema";

const DUOLINGO: LearnTree = tree("duolingo", [
  unit("det-lit", "Literacy", "Грамотність", [
    "Read and Complete", "Read and Select", "Read then Write", "Interactive Writing",
    "Writing Sample",
  ]),
  unit("det-comp", "Comprehension", "Розуміння", [
    "Listen and Type", "Interactive Listening", "Read and Select (listen-adjacent)",
  ]),
  unit("det-conv", "Conversation", "Розмова", [
    "Listen then Speak", "Read Aloud", "Speak About the Photo",
  ]),
  unit("det-prod", "Production", "Продукція", [
    "Write About the Photo", "Speaking Sample", "Extended written response",
  ]),
]);

export default DUOLINGO;
