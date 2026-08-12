import { describe, it, expect } from "vitest";
import { normalizeQuestionText, hashQuestionText, checkAndRecordQuestion } from "./question-novelty";

describe("normalizeQuestionText", () => {
  it("lowercases and collapses whitespace", () => {
    expect(normalizeQuestionText("What   is  2+2?")).toBe("what is 2 2");
  });

  it("treats punctuation-only differences as the same question", () => {
    expect(normalizeQuestionText("What is the capital of France?")).toBe(
      normalizeQuestionText("what is the capital of france"),
    );
  });

  it("does not collapse genuinely different wording", () => {
    expect(normalizeQuestionText("What is 2+2?")).not.toBe(normalizeQuestionText("What is 3+3?"));
  });
});

describe("hashQuestionText", () => {
  it("is deterministic for the same normalized text", async () => {
    const a = await hashQuestionText("What is 2+2?");
    const b = await hashQuestionText("what is 2 2");
    expect(a).toBe(b);
  });

  it("differs for different questions", async () => {
    const a = await hashQuestionText("What is 2+2?");
    const b = await hashQuestionText("What is 3+3?");
    expect(a).not.toBe(b);
  });
});

// `rpcMatch` is optional — when provided, the fake's rpc() calls it with the
// exact-question text and returns whatever id it decides is a paraphrase
// match (or null for no match). Lets each test control the "does pg_trgm
// think this is similar?" outcome deterministically.
type RpcMatch = (params: { p_exam_taxonomy: string; p_text: string }) => string | null;

function makeFakeSupabase(
  bank: Map<string, { id: string; hash: string; text: string; taxonomy: string }>,
  seen: Set<string>,
  rpcMatch?: RpcMatch,
) {
  let nextId = 1;
  return {
    from: (table: string) => {
      if (table === "ai_question_bank") {
        return {
          select: () => ({
            eq: (_col1: string, taxonomy: string) => ({
              eq: (_col2: string, hash: string) => ({
                maybeSingle: async () => {
                  const row = bank.get(`${taxonomy}::${hash}`);
                  return { data: row ? { id: row.id } : null, error: null };
                },
              }),
            }),
          }),
          insert: (row: Record<string, unknown>) => {
            const id = String(nextId++);
            const key = `${row.exam_taxonomy}::${row.question_hash}`;
            const p = Promise.resolve({ error: null }) as unknown as { select: (c: string) => { single: () => Promise<unknown> } } & Promise<{ error: unknown }>;
            p.select = () => ({
              single: async () => {
                bank.set(key, {
                  id,
                  hash: row.question_hash as string,
                  text: row.question_text as string,
                  taxonomy: row.exam_taxonomy as string,
                });
                return { data: { id }, error: null };
              },
            });
            return p;
          },
        };
      }
      // user_seen_questions
      return {
        select: undefined as never,
        insert: (row: Record<string, unknown>) => {
          seen.add(`${row.user_id}::${row.question_id}`);
          return Promise.resolve({ error: null });
        },
        upsert: async (row: Record<string, unknown>) => {
          seen.add(`${row.user_id}::${row.question_id}`);
          return { error: null };
        },
      };
    },
    rpc: async (fn: string, params: Record<string, unknown>) => {
      if (fn !== "match_similar_question") return { data: null, error: { code: "PGRST202" } };
      if (!rpcMatch) return { data: [], error: null };
      const matchedId = rpcMatch({
        p_exam_taxonomy: params.p_exam_taxonomy as string,
        p_text: params.p_text as string,
      });
      return { data: matchedId ? [{ id: matchedId, similarity: 0.85 }] : [], error: null };
    },
  } as unknown as Parameters<typeof checkAndRecordQuestion>[0];
}

describe("checkAndRecordQuestion", () => {
  it("is not a duplicate the first time a question is recorded", async () => {
    const bank = new Map();
    const seen = new Set<string>();
    const sb = makeFakeSupabase(bank, seen);
    const result = await checkAndRecordQuestion(sb, "user-1", "ielts", "Reading", "What is 2+2?");
    expect(result.duplicate).toBe(false);
    expect(bank.size).toBe(1);
  });

  it("flags a second, reworded submission of the same question as a duplicate", async () => {
    const bank = new Map();
    const seen = new Set<string>();
    const sb = makeFakeSupabase(bank, seen);
    await checkAndRecordQuestion(sb, "user-1", "ielts", "Reading", "What is 2+2?");
    const result = await checkAndRecordQuestion(sb, "user-2", "ielts", "Reading", "what is 2 2");
    expect(result.duplicate).toBe(true);
  });

  it("does not treat the same question text as a duplicate across different exams", async () => {
    const bank = new Map();
    const seen = new Set<string>();
    const sb = makeFakeSupabase(bank, seen);
    await checkAndRecordQuestion(sb, "user-1", "ielts", "Reading", "What is 2+2?");
    const result = await checkAndRecordQuestion(sb, "user-1", "sat", "Math", "What is 2+2?");
    expect(result.duplicate).toBe(false);
  });

  it("degrades to not-a-duplicate when the table doesn't exist yet", async () => {
    const sb = {
      from: () => ({
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { code: "PGRST205" } }) }) }) }),
        insert: () => {
          throw new Error("should not reach insert when select already errored");
        },
      }),
    } as unknown as Parameters<typeof checkAndRecordQuestion>[0];
    const result = await checkAndRecordQuestion(sb, "user-1", "ielts", null, "anything");
    expect(result.duplicate).toBe(false);
  });

  it("flags a paraphrased question via pg_trgm rpc as duplicate (no hash match, similarity match)", async () => {
    const bank = new Map<string, { id: string; hash: string; text: string; taxonomy: string }>();
    const seen = new Set<string>();
    // Seed the bank the normal way, then set up an rpc mock that returns
    // its id for any query targeting that exam.
    const seedSb = makeFakeSupabase(bank, seen);
    await checkAndRecordQuestion(seedSb, "user-1", "ielts", "algebra", "Solve for x: 3x + 5 = 20");
    const seededId = Array.from(bank.values())[0]?.id;
    expect(seededId).toBeDefined();

    const sb = makeFakeSupabase(bank, seen, ({ p_exam_taxonomy }) =>
      p_exam_taxonomy === "ielts" ? seededId ?? null : null,
    );
    const result = await checkAndRecordQuestion(sb, "user-2", "ielts", "algebra", "Find x when 3x + 5 = 20");
    expect(result.duplicate).toBe(true);
    // The paraphrase branch marks the ORIGINAL row as seen, not a new row —
    // bank size must NOT grow when a near-dup is caught.
    expect(bank.size).toBe(1);
    expect(seen.has(`user-2::${seededId}`)).toBe(true);
  });

  it("does not flag a genuinely different question even when rpc runs", async () => {
    const bank = new Map<string, { id: string; hash: string; text: string; taxonomy: string }>();
    const seen = new Set<string>();
    const seedSb = makeFakeSupabase(bank, seen);
    await checkAndRecordQuestion(seedSb, "user-1", "ielts", "algebra", "Solve for x: 3x + 5 = 20");

    // rpc returns null → similarity below threshold → treated as new question
    const sb = makeFakeSupabase(bank, seen, () => null);
    const result = await checkAndRecordQuestion(sb, "user-2", "ielts", "geography", "What is the capital of France?");
    expect(result.duplicate).toBe(false);
    expect(bank.size).toBe(2);
  });

  it("degrades to not-a-duplicate when the rpc function isn't deployed yet (PGRST202)", async () => {
    const bank = new Map<string, { id: string; hash: string; text: string; taxonomy: string }>();
    const seen = new Set<string>();
    // makeFakeSupabase's rpc without rpcMatch returns [] for match_similar_question
    // — simulate the harsher "function not found" via a custom sb where rpc errors.
    const baseSb = makeFakeSupabase(bank, seen) as unknown as {
      from: unknown;
      rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
    };
    baseSb.rpc = async () => ({ data: null, error: { code: "PGRST202" } });
    const sb = baseSb as unknown as Parameters<typeof checkAndRecordQuestion>[0];
    const result = await checkAndRecordQuestion(sb, "user-1", "ielts", "algebra", "brand new question");
    expect(result.duplicate).toBe(false);
    // Insert path still ran despite the rpc error — the new question was banked.
    expect(bank.size).toBe(1);
  });
});
