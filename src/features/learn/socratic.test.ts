import { describe, expect, it } from "vitest";
import { buildSocraticSystem, parseSocraticTurn, recentMistakeLines } from "./socratic";

describe("parseSocraticTurn", () => {
  it("reads a JSON turn", () => {
    const turn = parseSocraticTurn('{"say":"Why is log_2(8) = 3?","kind":"question"}');
    expect(turn.say).toBe("Why is log_2(8) = 3?");
    expect(turn.kind).toBe("question");
  });

  it("falls back to prose when the model skips JSON", () => {
    const turn = parseSocraticTurn("Why is it 3?");
    expect(turn.say).toBe("Why is it 3?");
    expect(turn.kind).toBe("question");
  });

  it("keeps formal text on discovery", () => {
    const turn = parseSocraticTurn('{"say":"You just defined it.","kind":"formal","formal":"log_b a is the exponent."}');
    expect(turn.kind).toBe("formal");
    expect(turn.formal).toContain("exponent");
  });

  it("pulls say out of fenced JSON with real newlines", () => {
    const raw = "```json\n{\n  \"say\": \"3 divides 12 when 12 = 3k for a whole k.\\nTry 15 ÷ 3.\\nTry 14 ÷ 3.\",\n  \"kind\": \"formal\",\n  \"formal\": \"a | b iff b = a k\"\n}\n```";
    const turn = parseSocraticTurn(raw);
    expect(turn.kind).toBe("formal");
    expect(turn.say).toContain("3 divides 12");
    expect(turn.say).toContain("Try 14");
    expect(turn.formal).toContain("a | b");
    expect(turn.say).not.toContain("\"kind\"");
  });

  it("does not dump the raw blob when JSON is broken", () => {
    const raw = `{"say": "a divides b if there is a whole k
such that b = a k.", "kind": "formal", "formal": "a | b"}`;
    const turn = parseSocraticTurn(raw);
    expect(turn.say).toContain("a divides b");
    expect(turn.say).not.toMatch(/"kind"/);
    expect(turn.kind).toBe("formal");
  });
});

describe("recentMistakeLines", () => {
  it("keeps only matching topic rows", () => {
    const lines = recentMistakeLines([
      { topic: "Logarithms", question: "log2(16)" },
      { topic: "Triangles", question: "area" },
    ], "Logarithms");
    expect(lines).toContain("log2(16)");
    expect(lines).not.toContain("area");
  });
});

describe("buildSocraticSystem", () => {
  it("forbids lecturing before formal", () => {
    const system = buildSocraticSystem({
      topic: "Logarithms",
      language: "uk",
      mistakes: "",
      hintUsed: false,
      surrendered: false,
      turnCount: 0,
    });
    expect(system).toMatch(/do not lecture/i);
    expect(system).toMatch(/Never give the definition/);
  });

  it("explains then drills after surrender, and does not close the chat", () => {
    const first = buildSocraticSystem({
      topic: "Logarithms",
      language: "uk",
      mistakes: "",
      hintUsed: true,
      surrendered: true,
      justSurrendered: true,
      turnCount: 4,
    });
    expect(first).toMatch(/just surrendered/i);
    expect(first).toMatch(/TWO short numbered practice/);
    expect(first).toMatch(/NEVER set kind to done on this turn/);

    const later = buildSocraticSystem({
      topic: "Logarithms",
      language: "uk",
      mistakes: "",
      hintUsed: true,
      surrendered: true,
      turnCount: 6,
    });
    expect(later).toMatch(/on practice/i);
    expect(later).toMatch(/Do not close early/);
  });
});
