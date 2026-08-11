/**
 * Detection-only check for audit finding #14: a legacy (non-course) exam's
 * mastery is keyed by "examId::topicIdx" — the topic's array position, not a
 * stable id. If exam.topics is ever replaced in a different order (the
 * confirmed live path: ai-enrichment.jsx overwriting the whole array with an
 * AI-decided ordering), a mastery entry recorded under the old index now
 * silently describes whatever topic ended up there instead.
 *
 * This does not fix that — see docs/bugs-fixed.md's #14 row for why a real
 * migration needs its own design. It only proves the drift gets *noticed*
 * (once per key, via the same Sentry/console.warn pattern as #30's fix) so
 * real occurrences can be measured before committing to one.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "../bootstrap";

interface Exam {
  id: string;
  name: string;
  topics: string[];
  courseId?: string | null;
  [key: string]: unknown;
}

type Store = {
  getExams: () => Exam[];
  saveExams: (exams: Exam[]) => void;
  getMastery: () => Record<string, unknown>;
  recordConfidence: (args: { examId: string; topicIdx: number; topicName: string; rating: number }) => void;
};

const s = window as unknown as Store;

const EXAM_ID = "__test_brain_store_drift__";
let originalExams: Exam[];

beforeEach(() => {
  originalExams = s.getExams();
});

afterEach(() => {
  s.saveExams(originalExams);
  try {
    const raw = localStorage.getItem("brain_mastery_v1");
    if (raw) {
      const map = JSON.parse(raw);
      Object.keys(map)
        .filter((k) => k.startsWith(`${EXAM_ID}::`))
        .forEach((k) => delete map[k]);
      localStorage.setItem("brain_mastery_v1", JSON.stringify(map));
    }
  } catch {
    /* best-effort cleanup */
  }
});

function withExam(topics: string[]) {
  const exam: Exam = { id: EXAM_ID, name: "Drift Test Exam", topics, courseId: null };
  s.saveExams([...originalExams.filter((e) => e.id !== EXAM_ID), exam]);
  return exam;
}

describe("getMastery — audit #14 drift detection", () => {
  it("warns once when a legacy entry's topicName no longer matches the exam's current topic at that index", () => {
    withExam(["Algebra", "Geometry"]);
    s.recordConfidence({ examId: EXAM_ID, topicIdx: 0, topicName: "Algebra", rating: 0.8 });

    // Reorder: what used to be at index 0 ("Algebra") is now "Geometry" —
    // the exact shape of the ai-enrichment.jsx replacement bug.
    withExam(["Geometry", "Algebra"]);

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    s.getMastery();
    s.getMastery(); // second read of the same drift must not warn again

    const drift = warn.mock.calls.filter((c) => String(c[0]).includes(`${EXAM_ID}::0`));
    expect(drift.length).toBe(1);
    expect(String(drift[0]?.[0])).toContain("Algebra");
    expect(String(drift[0]?.[0])).toContain("Geometry");
    warn.mockRestore();
  });

  it("does not warn when the topic name still matches", () => {
    withExam(["Algebra", "Geometry"]);
    s.recordConfidence({ examId: EXAM_ID, topicIdx: 1, topicName: "Geometry", rating: 0.5 });

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    s.getMastery();
    const drift = warn.mock.calls.filter((c) => String(c[0]).includes(`${EXAM_ID}::1`));
    expect(drift.length).toBe(0);
    warn.mockRestore();
  });

  it("does not touch or drop the stored entry — read-only detection", () => {
    withExam(["Algebra", "Geometry"]);
    s.recordConfidence({ examId: EXAM_ID, topicIdx: 0, topicName: "Algebra", rating: 0.8 });
    withExam(["Geometry", "Algebra"]);

    const before = s.getMastery()[`${EXAM_ID}::0`] as { topicName?: string } | undefined;
    const after = s.getMastery()[`${EXAM_ID}::0`] as { topicName?: string } | undefined;
    expect(before?.topicName).toBe("Algebra");
    expect(after?.topicName).toBe("Algebra");
  });
});
