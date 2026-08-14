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

function unwrapFences(raw: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  return (fenced?.[1] ?? raw).trim();
}

function readJsonString(blob: string, quoteAt: number): string | undefined {
  if (blob[quoteAt] !== "\"") return undefined;
  let i = quoteAt + 1;
  let raw = "";
  while (i < blob.length) {
    const c = blob[i];
    if (c === "\\") {
      raw += c + (blob[i + 1] ?? "");
      i += 2;
      continue;
    }
    if (c === "\"") {
      try {
        return JSON.parse(`"${raw.replace(/\n/g, "\\n").replace(/\r/g, "\\r")}"`) as string;
      } catch {
        return raw.replace(/\\n/g, "\n").replace(/\\"/g, "\"").replace(/\\\\/g, "\\");
      }
    }
    raw += c;
    i += 1;
  }
  return undefined;
}

function extractJsonFields(blob: string): { say?: string; kind?: string; formal?: string } {
  const out: { say?: string; kind?: string; formal?: string } = {};
  for (const key of ["say", "kind", "formal"] as const) {
    const re = new RegExp(`"${key}"\\s*:\\s*"`);
    const hit = re.exec(blob);
    if (!hit || hit.index == null) continue;
    const value = readJsonString(blob, hit.index + hit[0].length - 1);
    if (value != null && value.trim()) out[key] = value.trim();
  }
  return out;
}

function turnFromFields(row: { say?: unknown; kind?: unknown; formal?: unknown }): SocraticTurn | null {
  const say = typeof row.say === "string" ? row.say.trim() : "";
  if (!say) return null;
  const kind = KINDS.includes(row.kind as SocraticKind) ? (row.kind as SocraticKind) : "question";
  const formal = typeof row.formal === "string" && row.formal.trim() ? row.formal.trim() : undefined;
  return formal ? { say, kind, formal } : { say, kind };
}

export function parseSocraticTurn(raw: string): SocraticTurn {
  const text = unwrapFences(raw);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    const slice = text.slice(start, end + 1);
    try {
      const parsed = JSON.parse(slice) as { say?: unknown; kind?: unknown; formal?: unknown };
      const turn = turnFromFields(parsed);
      if (turn) return turn;
    } catch {
      // Surrender answers are 4–8 sentences; models often leave real
      // newlines inside "say", which is invalid JSON. Pull fields by hand
      // so the raw blob never hits the markdown renderer (that path paints
      // a fenced JSON block and overlapping KaTeX).
    }
    const turn = turnFromFields(extractJsonFields(slice));
    if (turn) return turn;
  }
  const loose = turnFromFields(extractJsonFields(text));
  if (loose) return loose;
  const say = text.trim();
  if (!say) throw new Error("empty socratic turn");
  if (/^\s*\{/.test(say) && /"kind"\s*:/.test(say)) {
    throw new Error("invalid socratic turn");
  }
  return { say, kind: "question" };
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
  justSurrendered?: boolean;
  turnCount: number;
}): string {
  const mistakesBlock = opts.mistakes
    ? `Recent mistakes on this topic:\n${opts.mistakes}`
    : "No logged mistakes on this topic.";
  const hintLine = opts.hintUsed
    ? "The student already used their one hint. Do not hint again."
    : "The student has one hint left. Only spend it if the user message is [HINT].";
  const wrap = opts.justSurrendered
    ? "The student just surrendered. Explain the concept fully in say (4–8 sentences is fine). Put the formal definition in formal. End say with TWO short numbered practice problems they must try. Set kind to formal. NEVER set kind to done on this turn — the chat stays open."
    : opts.surrendered
      ? "You already explained after surrender. They are on practice. Check the answer. If wrong, nudge and give a simpler twin. If they solve one, give or confirm the second. Only set kind to done after they get TWO practice items right, or one solid answer plus they restate the idea in their own words. Do not close early."
      : opts.turnCount >= 12
        ? "The dialogue is long enough. Guide them to state the idea in one sentence, then set kind to formal and fill formal."
        : "Do not explain the concept on the first turns. Ask, then ask again.";
  const sayLimit = opts.justSurrendered || opts.surrendered
    ? "After surrender, say may be a short explanation plus two numbered practice items."
    : "Maximum two sentences in say.";

  return `You are a Socratic exam coach for the topic "${opts.topic}".
The student must discover the idea. You do not lecture.

OUTPUT ONLY valid JSON — no markdown fences, no text before or after:
{"say":"at most two short sentences","kind":"question|nudge|formal|done","formal":"optional formal definition"}

kind:
- question — a leading question
- nudge — they were wrong or vague; counter-example or "what if…", still a question
- formal — they just derived it, OR you just explained after surrender; put the formal definition in formal, then a practice question in say
- done — they applied it correctly after formal, or they solved the post-surrender practice. NEVER on the surrender turn itself.

Rules:
1. Never give the definition before kind is formal or done.
2. ${sayLimit}
3. If they are wrong, do not say "incorrect". Ask a tighter question.
4. Catch misconceptions immediately with a counter-example.
5. Language: ${opts.language}. Warm, respectful, "Ви" in Ukrainian/Russian.
6. ${hintLine}
7. ${wrap}
8. ${mistakesBlock}
9. Math in say/formal as LaTeX: $x^2$, $$\\log_2 8=3$$.`;
}
