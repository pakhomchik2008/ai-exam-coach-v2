// Feynman teach-back — parse the coach grade. Voice is browser
// SpeechRecognition only (no Whisper / no new AI vendor).
//
// The model often puts LaTeX `\frac` inside JSON. That is not a valid JSON
// escape, so parseJSON returns null and the old parser threw
// "invalid feynman grade" at the student. We repair those slashes, accept
// field aliases, and fall back to the raw prose so a grade always shows.

export type FeynmanGrade = {
  clarity: number;
  completeness: number;
  gaps: readonly string[];
  feedback: string;
};

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10, Math.round(v)));
}

function tryParseJsonObject(s: string): Record<string, unknown> | null {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  const slice = s.slice(start, end + 1);
  for (const candidate of [slice, slice.replace(/\\(?!["\\/bfnrtu])/g, "\\\\")]) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      if (Array.isArray(parsed) && parsed[0] && typeof parsed[0] === "object") {
        return parsed[0] as Record<string, unknown>;
      }
    } catch {
      // try the repaired slice
    }
  }
  return null;
}

function asGradeRow(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (Array.isArray(raw) && raw[0] && typeof raw[0] === "object") return raw[0] as Record<string, unknown>;
  if (typeof raw === "string") return tryParseJsonObject(raw);
  return null;
}

function pickFeedback(row: Record<string, unknown>): string {
  for (const key of ["feedback", "comment", "text", "message", "grade"]) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export function parseFeynmanGrade(raw: unknown): FeynmanGrade {
  const row = asGradeRow(raw);
  if (row) {
    const feedback = pickFeedback(row);
    const gaps = Array.isArray(row.gaps)
      ? row.gaps.filter((g): g is string => typeof g === "string" && g.trim().length > 0)
      : [];
    if (feedback) {
      return {
        clarity: clampScore(row.clarity),
        completeness: clampScore(row.completeness),
        gaps,
        feedback,
      };
    }
  }
  if (typeof raw === "string" && raw.trim()) {
    return { clarity: 0, completeness: 0, gaps: [], feedback: raw.trim() };
  }
  throw new Error("invalid feynman grade");
}

export function buildFeynmanSystem(topic: string, language: string): string {
  return `You grade a student's teach-back of "${topic}" as if they explained it to a beginner.

OUTPUT ONLY valid JSON — no markdown fences, no prose around it:
{"clarity":1-10,"completeness":1-10,"gaps":["missing idea 1"],"feedback":"4-8 sentences, concrete"}

Rules:
- Be specific. Quote what they got right. Name what they skipped.
- If they have a misconception, say what is actually true.
- Gibberish, "I don't know", a single word, or anything under one real sentence: scores <= 2, honest feedback, no praise.
- Language: ${language}.
- Math as LaTeX $...$. In JSON, write every backslash twice (\\\\frac not \\frac).`;
}
