/**
 * Fail-closed gate for teach-back / explain / Socratic "done".
 *
 * The model grades generously: "idk" still gets a 7 and kind:done. A prompt
 * rule asking it not to is a request. This file is the guarantee — obvious
 * non-answers never reach the grader, and a Socratic "done" on a shrug is
 * rewritten to a question. Vitest hits the five known-weak transcripts
 * without spending a token.
 */

const SHRUG = /^(idk|i\s*don'?t\s*know|dunno|n\/?a|lol|lmao|ok|okay|yes|no|yep|nope|хз|не\s*знаю|незнаю|je\s*sais\s*pas|keine\s*ahnung|weiß\s*nicht)\.?$/i;

const FILLER = new Set([
  "a", "an", "and", "again", "about", "it", "is", "the", "this", "that", "then",
  "when", "thing", "things", "stuff", "goes", "go", "up", "down", "like", "just",
  "some", "something", "whatever", "kinda", "sort", "of", "to", "for", "in",
  "on", "or", "so", "very", "really", "idk", "ну", "це", "это", "вот", "как",
  "там", "просто", "типо", "типа",
]);

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function contentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}$]+/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !FILLER.has(w));
}

/**
 * True when there is nothing here a teacher could mark. Short maths with a
 * digit or `$…$` is allowed — "x = 2" is a real answer. A single noun that
 * happens to be the topic name is not. Handwaves made of filler ("the thing
 * goes up and then down") count as empty even when they clear eight words.
 */
export function isWeakTeachBack(text: string, topic = ""): boolean {
  const trimmed = (text || "").trim();
  if (!trimmed) return true;
  if (SHRUG.test(trimmed)) return true;
  const topicNorm = topic.trim().toLowerCase();
  if (topicNorm && trimmed.toLowerCase() === topicNorm) return true;
  if (/\$[^$]+\$/.test(trimmed) || /\d/.test(trimmed)) return false;
  if (wordCount(trimmed) < 8) return true;
  const content = contentWords(trimmed);
  if (content.length < 3) return true;
  // "asdf asdf asdf" has three tokens and still says nothing.
  return new Set(content).size === 1;
}

export function failClosedExplain(): { score: number; pass: false; feedback: string } {
  return {
    score: 1,
    pass: false,
    feedback: "Too short or off-topic to mark. Name the idea, say how it works, give one example.",
  };
}

export function failClosedFeynman(): {
  clarity: number;
  completeness: number;
  gaps: readonly string[];
  feedback: string;
} {
  return {
    clarity: 1,
    completeness: 1,
    gaps: ["too little content to grade"],
    feedback: "Too short or off-topic to count as an explanation. Say what it is, how it works, and one example.",
  };
}
