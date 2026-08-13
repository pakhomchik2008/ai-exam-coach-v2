// Socratic Learn method — prompt + turn parse.
//
// Lives outside AIChat.jsx so the "never explain first" contract is
// unit-tested. The dialog UI calls these, then window.brainComplete.

export type SocraticKind = "question" | "nudge" | "formal" | "done";

export type SocraticTurn = {
  say: string;
  kind: SocraticKind;
  formal?: string;
};

const KINDS: readonly SocraticKind[] = ["question", "nudge", "formal", "done"];

export function parseSocraticTurn(raw: string): SocraticTurn {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) {
    const say = raw.trim();
    if (!say) throw new Error("empty socratic turn");
    return { say, kind: "question" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    const say = raw.trim();
    if (!say) throw new Error("empty socratic turn");
    return { say, kind: "question" };
  }
  if (!parsed || typeof parsed !== "object") throw new Error("invalid socratic turn");
  const row = parsed as { say?: unknown; kind?: unknown; formal?: unknown };
  const say = typeof row.say === "string" ? row.say.trim() : "";
  if (!say) throw new Error("socratic turn missing say");
  const kind = KINDS.includes(row.kind as SocraticKind) ? (row.kind as SocraticKind) : "question";
  const formal = typeof row.formal === "string" && row.formal.trim() ? row.formal.trim() : undefined;
  return formal ? { say, kind, formal } : { say, kind };
}

export function recentMistakeLines(
  mistakes: readonly { topic?: string; question?: string }[],
  topic: string,
  limit = 5,
): string {
  const needle = topic.toLowerCase();
  return mistakes
    .filter((m) => {
      const t = (m.topic || "").toLowerCase();
      return t && (t.includes(needle) || needle.includes(t));
    })
    .slice(0, limit)
    .map((m) => `- ${m.question || ""}`.trim())
    .filter((line) => line.length > 2)
    .join("\n");
}

export function buildSocraticSystem(opts: {
  topic: string;
  language: string;
  mistakes: string;
  hintUsed: boolean;
  surrendered: boolean;
  turnCount: number;
}): string {
  const mistakesBlock = opts.mistakes
    ? `Recent mistakes on this topic:\n${opts.mistakes}`
    : "No logged mistakes on this topic.";
  const hintLine = opts.hintUsed
    ? "The student already used their one hint. Do not hint again."
    : "The student has one hint left. Only spend it if the user message is [HINT].";
  const wrap = opts.surrendered
    ? "The student surrendered. Set kind to done. Explain the concept fully in say. Put the formal definition in formal."
    : opts.turnCount >= 12
      ? "The dialogue is long enough. Guide them to state the idea in one sentence, then set kind to formal and fill formal."
      : "Do not explain the concept on the first turns. Ask, then ask again.";

  return `You are a Socratic exam coach for the topic "${opts.topic}".
The student must discover the idea. You do not lecture.

OUTPUT ONLY valid JSON — no markdown fences, no text before or after:
{"say":"at most two short sentences","kind":"question|nudge|formal|done","formal":"optional formal definition"}

kind:
- question — a leading question
- nudge — they were wrong or vague; counter-example or "what if…", still a question
- formal — they just derived it; confirm, put the formal definition in formal, then one new apply-question in say
- done — concept closed (surrender, or they applied it correctly after formal)

Rules:
1. Never give the definition before kind is formal or done.
2. Maximum two sentences in say.
3. If they are wrong, do not say "incorrect". Ask a tighter question.
4. Catch misconceptions immediately with a counter-example.
5. Language: ${opts.language}. Warm, respectful, "Ви" in Ukrainian/Russian.
6. ${hintLine}
7. ${wrap}
8. ${mistakesBlock}
9. Math in say/formal as LaTeX: $x^2$, $$\\log_2 8=3$$.`;
}
