/**
 * Structured AI replies were the quietest failure in the app: a model that
 * wrapped its JSON in a sentence produced a lesson with no quiz, a drill one
 * question short, or an empty flashcard deck — with nothing in the console and
 * nothing on screen to say so.
 *
 * These cover the two halves of the fix: every failed parse announces itself,
 * and a malformed reply gets exactly one repair round-trip before the caller
 * falls back.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./ai-brain.jsx";

type Win = typeof window & {
  claude?: { complete: (args: unknown) => Promise<string> };
  parseJSON: (raw: unknown, fallback?: unknown, where?: string) => unknown;
  brainCompleteJSON: (opts: unknown, fallback?: unknown) => Promise<unknown>;
};

const w = window as Win;

/** Queue of replies `window.claude.complete` hands back, oldest first. */
function stubClaude(replies: string[]): { calls: unknown[] } {
  const calls: unknown[] = [];
  w.claude = {
    complete: (args: unknown) => {
      calls.push(args);
      const next = replies.shift();
      if (next === undefined) throw new Error("claude.complete called more times than stubbed");
      return Promise.resolve(next);
    },
  };
  return { calls };
}

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
  delete w.claude;
});

describe("parseJSON", () => {
  it("reads a fenced object", () => {
    expect(w.parseJSON('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(warn).not.toHaveBeenCalled();
  });

  it("reads an object buried in prose", () => {
    expect(w.parseJSON('Sure! Here you go: {"a":1} — hope that helps')).toEqual({ a: 1 });
  });

  it("names the failure instead of returning the fallback in silence", () => {
    expect(w.parseJSON("I cannot help with that.", { questions: [] })).toEqual({ questions: [] });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("no JSON in response");
  });

  it("reports a truncated object", () => {
    expect(w.parseJSON('{"a":1', "fb")).toBe("fb");
    expect(String(warn.mock.calls[0]?.[0])).toContain("unterminated JSON");
  });

  it("reports a syntax error and includes a sample of what came back", () => {
    expect(w.parseJSON('{"a":,}', null)).toBe(null);
    expect(String(warn.mock.calls[0]?.[0])).toContain('{"a":,}');
  });

  it("reports a non-string reply", () => {
    expect(w.parseJSON(undefined, "fb")).toBe("fb");
    expect(String(warn.mock.calls[0]?.[0])).toContain("not a string");
  });
});

describe("brainCompleteJSON", () => {
  it("does not spend a second call when the first reply parses", async () => {
    const { calls } = stubClaude(['{"ok":true}']);
    await expect(w.brainCompleteJSON({ prompt: "go" })).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(1);
  });

  it("repairs a prose-wrapped reply by handing it back to the model", async () => {
    const { calls } = stubClaude(["Sorry, here is the plan in words.", '{"ok":true}']);
    await expect(w.brainCompleteJSON({ prompt: "go" })).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(2);

    const retry = calls[1] as { messages: { role: string; content: string }[] };
    expect(retry.messages[0]).toEqual({ role: "user", content: "go" });
    expect(retry.messages[1]).toEqual({ role: "assistant", content: "Sorry, here is the plan in words." });
    expect(retry.messages[2]?.content).toContain("not valid JSON");
  });

  it("keeps the caller's own message history in the repair turn", async () => {
    const history = [{ role: "user", content: "first" }, { role: "assistant", content: "reply" }];
    const { calls } = stubClaude(["nope", '{"ok":true}']);
    await w.brainCompleteJSON({ messages: history });

    const retry = calls[1] as { messages: { role: string; content: string }[] };
    expect(retry.messages.slice(0, 2)).toEqual(history);
    expect(retry.messages).toHaveLength(4);
  });

  it("falls back after one failed repair, having said so twice", async () => {
    const { calls } = stubClaude(["still prose", "more prose"]);
    await expect(w.brainCompleteJSON({ prompt: "go" }, { questions: [] }))
      .resolves.toEqual({ questions: [] });
    expect(calls).toHaveLength(2);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("does not send an empty assistant turn the API would reject", async () => {
    const { calls } = stubClaude([""]);
    await expect(w.brainCompleteJSON({ prompt: "go" }, "fb")).resolves.toBe("fb");
    expect(calls).toHaveLength(1);
  });

  it("returns a legitimate null field rather than treating it as a failure", async () => {
    stubClaude(['{"score":null}']);
    await expect(w.brainCompleteJSON({ prompt: "go" }, "fb")).resolves.toEqual({ score: null });
    expect(warn).not.toHaveBeenCalled();
  });
});
