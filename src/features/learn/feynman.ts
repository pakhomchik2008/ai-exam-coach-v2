// Feynman teach-back — parse the coach grade. Voice is browser
// SpeechRecognition only (no Whisper / no new AI vendor).

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

export function parseFeynmanGrade(raw: unknown): FeynmanGrade {
  if (!raw || typeof raw !== "object") throw new Error("invalid feynman grade");
  const row = raw as { clarity?: unknown; completeness?: unknown; gaps?: unknown; feedback?: unknown };
  const feedback = typeof row.feedback === "string" ? row.feedback.trim() : "";
  if (!feedback) throw new Error("feynman grade missing feedback");
  const gaps = Array.isArray(row.gaps)
    ? row.gaps.filter((g): g is string => typeof g === "string" && g.trim().length > 0)
    : [];
  return {
    clarity: clampScore(row.clarity),
    completeness: clampScore(row.completeness),
    gaps,
    feedback,
  };
}

export function buildFeynmanSystem(topic: string, language: string): string {
  return `You grade a student's teach-back of "${topic}" as if they explained it to a beginner.

OUTPUT ONLY valid JSON:
{"clarity":1-10,"completeness":1-10,"gaps":["missing idea 1"],"feedback":"4-8 sentences, concrete"}

Rules:
- Be specific. Quote what they got right. Name what they skipped.
- If they have a misconception, say what is actually true.
- Language: ${language}.
- Math as LaTeX $...$.`;
}
