// AI Exam Coach — persisted log of real quiz mistakes.
// Entries only ever come from an actual wrong answer a user actually picked
// in StudyHub's AI-generated quiz — never fabricated, so an empty list here
// means "no mistakes yet," not "feature not wired up."
const MISTAKES_KEY = "mistakes_v1";

function getMistakes() {
  try { return JSON.parse(localStorage.getItem(MISTAKES_KEY)) || []; } catch { return []; }
}
function saveMistakes(list) {
  try { localStorage.setItem(MISTAKES_KEY, JSON.stringify(list)); } catch {}
}
function logMistake({ topic, question, options, correctIndex, selectedIndex, explanation, examId, topicIdx }) {
  const list = getMistakes();
  list.unshift({
    id: "m" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    topic: topic || "General",
    question, options: options || [],
    correctIndex, selectedIndex,
    explanation: explanation || "",
    // Optional linkage to the brain's topic model — enables clustering mistakes
    // by exam/topic and tying them to mastery. Absent for legacy entries.
    examId: examId != null ? examId : null,
    topicIdx: typeof topicIdx === "number" ? topicIdx : null,
    at: Date.now(),
  });
  saveMistakes(list.slice(0, 200));
}
function clearMistake(id) {
  saveMistakes(getMistakes().filter((m) => m.id !== id));
}
function clearAllMistakes() {
  saveMistakes([]);
}

Object.assign(window, { MISTAKES_KEY, getMistakes, logMistake, clearMistake, clearAllMistakes });
