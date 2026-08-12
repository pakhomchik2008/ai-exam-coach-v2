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

function makeFakeSupabase(bank: Map<string, { id: string; hash: string }>, seen: Set<string>) {
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
                bank.set(key, { id, hash: row.question_hash as string });
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
});
