import { describe, expect, it, vi, afterEach } from "vitest";
import "../bootstrap";
import { predictedFromReadiness, schemeFromExam } from "./scales";
import {
  fetchPredictorCommentary,
  gradeProbability,
  predictorCommentaryPrompt,
  weakestTopics,
} from "../../api/_predictor.js";

declare global {
  interface Window {
    deriveCourse: (exam: Record<string, unknown>) => { predictedGrade: string };
    saveExams: (list: unknown[]) => void;
    getExams: () => Record<string, unknown>[];
  }
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString();
}

describe("gradeProbability", () => {
  it("matches exams-store.jsx's deriveCourse formula (drift guard)", () => {
    const raw = {
      id: "e1",
      name: "SAT",
      examBoard: "Custom",
      examDate: daysFromNow(45),
      completionPct: 60,
      confidencePct: 70,
      qualificationId: "sat",
    };
    window.saveExams([raw]);
    const [saved] = window.getExams ? window.getExams() : [raw];
    const course = window.deriveCourse(saved);
    const myProb = gradeProbability(saved);
    const myPredicted = predictedFromReadiness(myProb, schemeFromExam({ qualificationId: "sat", name: "SAT" }));
    expect(myPredicted).toBe(course.predictedGrade);
  });

  it("clamps to 0-99 and rewards being ahead of the pace schedule", () => {
    const ahead = gradeProbability({ completionPct: 100, confidencePct: 100, examDate: daysFromNow(60) });
    const behind = gradeProbability({ completionPct: 5, confidencePct: 20, examDate: daysFromNow(1) });
    expect(ahead).toBeLessThanOrEqual(99);
    expect(ahead).toBeGreaterThan(behind);
  });

  it("treats a missing confidencePct as the neutral 50 default", () => {
    const withDefault = gradeProbability({ completionPct: 40, examDate: daysFromNow(30) });
    const explicit50 = gradeProbability({ completionPct: 40, confidencePct: 50, examDate: daysFromNow(30) });
    expect(withDefault).toBe(explicit50);
  });
});

describe("weakestTopics", () => {
  it("ranks by active mistake count, most-missed first", () => {
    const mistakes = [
      { topic: "Algebra", status: "active" },
      { topic: "Algebra", status: "active" },
      { topic: "Geometry", status: "active" },
      { topic: "Reading", status: "recovered" },
    ];
    expect(weakestTopics(mistakes)).toEqual(["Algebra", "Geometry"]);
  });

  it("excludes recovered mistakes entirely", () => {
    expect(weakestTopics([{ topic: "Algebra", status: "recovered" }])).toEqual([]);
  });

  it("falls back to General for an untagged mistake, same as mistakes-store.jsx", () => {
    expect(weakestTopics([{ status: "active" }])).toEqual(["General"]);
  });

  it("respects the limit", () => {
    const mistakes = ["A", "B", "C", "D"].map((topic) => ({ topic, status: "active" }));
    expect(weakestTopics(mistakes, 2)).toHaveLength(2);
  });
});

describe("predictorCommentaryPrompt", () => {
  it("never restates or contradicts the formula's number as its own estimate", () => {
    const prompt = predictorCommentaryPrompt({ examName: "IELTS", probability: 72, weakTopics: ["Listening"], lang: "en" });
    expect(prompt).toContain("72%");
    expect(prompt).toContain("do not restate or contradict");
    expect(prompt).toContain("Listening");
  });

  it("names the response language explicitly", () => {
    const prompt = predictorCommentaryPrompt({ examName: "НМТ", probability: 50, weakTopics: [], lang: "uk" });
    expect(prompt).toContain("Respond only in Ukrainian");
  });

  it("says nothing false when there are no weak topics", () => {
    const prompt = predictorCommentaryPrompt({ examName: "SAT", probability: 80, weakTopics: [], lang: "en" });
    expect(prompt).toContain("No recurring weak topics");
  });
});

describe("fetchPredictorCommentary", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the trimmed text on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: "  Keep it up.  " }] }),
    }));
    expect(await fetchPredictorCommentary("key", "prompt")).toBe("Keep it up.");
  });

  it("degrades to null on a non-ok response, never throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await fetchPredictorCommentary("key", "prompt")).toBeNull();
  });

  it("degrades to null on a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await fetchPredictorCommentary("key", "prompt")).toBeNull();
  });

  it("degrades to null without an API key or prompt", async () => {
    expect(await fetchPredictorCommentary("", "prompt")).toBeNull();
    expect(await fetchPredictorCommentary("key", "")).toBeNull();
  });
});
