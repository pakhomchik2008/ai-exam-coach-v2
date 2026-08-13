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

  it("switches to full explain on surrender", () => {
    const system = buildSocraticSystem({
      topic: "Logarithms",
      language: "uk",
      mistakes: "",
      hintUsed: true,
      surrendered: true,
      turnCount: 4,
    });
    expect(system).toMatch(/surrendered/i);
    expect(system).toMatch(/kind to done/);
  });
});
