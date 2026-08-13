// IELTS / TOEFL Speaking — cue + band parse.
// Whisper gives text. Pronunciation is inferred from that text, not
// from the waveform — the UI must say so (Decision Log #61).

export type SpeakingCue = {
  part: 1 | 2 | 3;
  title: string;
  prompt: string;
  bullets: readonly string[];
};

export type SpeakingBand = {
  fluency: number;
  lexical: number;
  grammar: number;
  pronunciation: number;
  overall: number;
  feedback: string;
  gaps: readonly string[];
};

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null;
}

function asString(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function asStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(asString).filter(Boolean);
}

function clampBand(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  const stepped = Math.round(v * 2) / 2;
  return Math.max(0, Math.min(9, stepped));
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
    } catch {
      // try the repaired slice
    }
  }
  return null;
}

export function parseSpeakingCue(raw: unknown): SpeakingCue {
  const row = typeof raw === "string" ? tryParseJsonObject(raw) : asRecord(raw);
  if (!row) throw new Error("invalid speaking cue");
  const title = asString(row.title) || asString(row.topic);
  const prompt = asString(row.prompt) || asString(row.question) || title;
  if (!prompt) throw new Error("invalid speaking cue");
  const partRaw = Number(row.part);
  const part = partRaw === 1 || partRaw === 3 ? partRaw : 2;
  return {
    part,
    title: title || prompt,
    prompt,
    bullets: asStringList(row.bullets).slice(0, 5),
  };
}

function hasScoreField(row: Record<string, unknown>): boolean {
  return ["fluency", "lexical", "vocabulary", "grammar", "pronunciation", "overall"]
    .some((key) => row[key] != null && row[key] !== "");
}

export function fallbackSpeakingBand(feedback: string): SpeakingBand {
  const text = asString(feedback) || "Too little speech to award a higher band. Say what, why, and one example.";
  return {
    fluency: 4, lexical: 4, grammar: 4, pronunciation: 4, overall: 4,
    feedback: text,
    gaps: ["Answer was too short or the grader did not return bands"],
  };
}

export function parseSpeakingBand(raw: unknown): SpeakingBand {
  const row = typeof raw === "string" ? tryParseJsonObject(raw) : asRecord(raw);
  if (row && hasScoreField(row)) {
    const fluency = clampBand(row.fluency);
    const lexical = clampBand(row.lexical ?? row.vocabulary);
    const grammar = clampBand(row.grammar);
    const pronunciation = clampBand(row.pronunciation);
    const overall = clampBand(
      row.overall ?? ((fluency + lexical + grammar + pronunciation) / 4),
    );
    const feedback = asString(row.feedback) || asString(row.comment)
      || `Band ${overall}. Add one concrete example next time.`;
    return {
      fluency, lexical, grammar, pronunciation, overall, feedback,
      gaps: asStringList(row.gaps),
    };
  }
  throw new Error("invalid speaking grade");
}

export function buildSpeakingCueSystem(topic: string, exam: string): string {
  return `You write one ${exam.toUpperCase()} Speaking Part 2 cue card about "${topic}".
OUTPUT ONLY valid JSON — no markdown fences:
{"part":2,"title":"short title","prompt":"Describe ... You should say:","bullets":["point 1","point 2","point 3"]}
Rules:
- Real exam register. English only for the card the student will speak from.
- 3 or 4 bullets. No answers on the card.`;
}

export function buildSpeakingGradeSystem(topic: string, exam: string): string {
  return `You are ONLY an ${exam.toUpperCase()} Speaking examiner. Grade the transcript on "${topic}".
OUTPUT ONLY valid JSON — no markdown, no chat, no other exams, no study-plan talk:
{"fluency":5.5,"lexical":6.0,"grammar":5.5,"pronunciation":6.0,"overall":6.0,"gaps":["one miss"],"feedback":"6-10 sentences"}
Rules:
- ALWAYS fill every band and ALWAYS write feedback. Even 3 words or silence get honest low bands (3.0–4.5) plus feedback saying what was missing.
- Bands in half-steps. overall is the mean, half-step.
- pronunciation is INFERRED from the transcript. Say that in feedback.
- Quote a phrase they used if any. Name one upgrade.
- Never ask what exam they want. Never mention NMT or a weekly plan.`;
}

export function buildSpeakingGradeUser(transcript: string, cueTitle: string): string {
  return `CUE: ${cueTitle}\nTRANSCRIPT:\n${transcript.trim() || "(silence)"}`;
}

export function isSpeakingTreeNode(nodeId: string | null | undefined): boolean {
  if (!nodeId) return false;
  return /^(s-|tf-speak-)/.test(nodeId);
}
