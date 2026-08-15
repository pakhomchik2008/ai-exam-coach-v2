/**
 * Golden set: teach-backs that must never earn a pass, and Socratic turns
 * that must never close the chat. These are fixtures — no model, no money.
 * The live grader still sits in `npm run eval`.
 */
import { describe, expect, it } from "vitest";
import { failClosedExplain, failClosedFeynman, isWeakTeachBack } from "./weak-transcript";
import { refusePrematureDone } from "../features/learn/socratic";

const WEAK: { name: string; text: string; topic?: string }[] = [
  { name: "idk", text: "idk something about energy" },
  { name: "handwave", text: "It is when the thing goes up and then it goes down again" },
  { name: "topic name only", text: "photosynthesis", topic: "photosynthesis" },
  { name: "Ukrainian shrug", text: "не знаю" },
  { name: "keyboard mash", text: "asdf asdf asdf" },
];

describe("golden set — weak teach-backs never pass", () => {
  it.each(WEAK)("$name is rejected locally, before the model can praise it", ({ text, topic }) => {
    expect(isWeakTeachBack(text, topic)).toBe(true);
    expect(failClosedExplain().pass).toBe(false);
    expect(failClosedExplain().score).toBeLessThan(6);
    expect(failClosedFeynman().clarity).toBeLessThan(6);
    expect(failClosedFeynman().completeness).toBeLessThan(6);
  });

  it("lets a real short maths answer through", () => {
    expect(isWeakTeachBack("$x = 2$", "Solve the equation")).toBe(false);
    expect(isWeakTeachBack("The area is 24 cm² because half base times height.")).toBe(false);
  });
});

describe("golden set — Socratic cannot close on a shrug", () => {
  it.each(WEAK)("$name cannot produce kind:done", ({ text }) => {
    const turn = refusePrematureDone(text, {
      say: "Great, you have it. Let's stop here.",
      kind: "done",
      formal: "whatever",
    });
    expect(turn.kind).not.toBe("done");
  });

  it("does not close on the opening turn (empty student text)", () => {
    const turn = refusePrematureDone("", { say: "What is a log?", kind: "done" });
    expect(turn.kind).toBe("question");
  });

  it("still allows done after a real answer", () => {
    const turn = refusePrematureDone(
      "A logarithm is the exponent you raise the base to, so log2(8)=3 because 2^3=8.",
      { say: "That's the definition. Well applied.", kind: "done" },
    );
    expect(turn.kind).toBe("done");
  });
});
