import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

// ExamRecap.jsx (like every other component in this app) reads React off the
// global rather than importing it — see src/bootstrap.ts.
(globalThis as unknown as { React: typeof React }).React = React;

const { ExamRecap } = await import("./ExamRecap.jsx");
const { recordAttempt, getAttempts } = await import("../../lib/exam-attempts");

const baseProps = {
  mode: "real" as const,
  examId: "e1",
  examName: "НМТ Математика",
  taxonomy: "nmt",
  correct: 8,
  total: 10,
  weakTopics: ["Тригонометрія"],
  sessionStartedAt: 1_000,
  headline: "Exam Submitted",
  stats: [{ val: "10/10", label: "Answered" }],
  onExit: () => {},
  t: { code: "en" },
};

beforeEach(() => {
  localStorage.clear();
  // No AI backend in tests — the coach comment must degrade, not throw.
  (window as unknown as Record<string, unknown>).brainComplete = () => Promise.reject(new Error("offline"));
  (window as unknown as Record<string, unknown>).getMistakes = () => [];
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ExamRecap", () => {
  it("reports the score on the exam's real scale, not as a letter grade", async () => {
    render(<ExamRecap {...baseProps} />);
    // 80% of the 100–200 НМТ scale is 180.
    expect(await screen.findByText("180")).toBeTruthy();
    expect(screen.getByText(/балів/)).toBeTruthy();
  });

  it("records exactly one attempt, even across re-renders", async () => {
    const { rerender } = render(<ExamRecap {...baseProps} />);
    await waitFor(() => expect(getAttempts()).toHaveLength(1));
    rerender(<ExamRecap {...baseProps} />);
    rerender(<ExamRecap {...baseProps} />);
    await waitFor(() => expect(getAttempts()).toHaveLength(1));
  });

  it("shows no delta on a first attempt, and says why", async () => {
    render(<ExamRecap {...baseProps} />);
    expect(await screen.findByText(/First attempt at this exam/)).toBeTruthy();
    expect(screen.queryByText("vs last")).toBeNull();
  });

  it("shows the change against the previous attempt of the same exam", async () => {
    recordAttempt({ examId: "e1", examName: "НМТ Математика", mode: "real", correct: 5, total: 10, taxonomy: "nmt" });
    render(<ExamRecap {...baseProps} />);
    // 80% now vs 50% before.
    expect(await screen.findByText("+30")).toBeTruthy();
    expect(screen.getByText("vs last")).toBeTruthy();
  });

  it("states a drop plainly rather than hiding it", async () => {
    recordAttempt({ examId: "e1", examName: "НМТ Математика", mode: "real", correct: 10, total: 10, taxonomy: "nmt" });
    render(<ExamRecap {...baseProps} />);
    expect(await screen.findByText("-20")).toBeTruthy();
  });

  it("labels a score as a plain percentage when the exam has no real scale", async () => {
    render(<ExamRecap {...baseProps} taxonomy={null} />);
    expect(await screen.findByText("80%")).toBeTruthy();
    expect(screen.getByText("Percent correct")).toBeTruthy();
  });

  it("offers the drill CTA only when weak topics exist", async () => {
    const onDrillWeak = vi.fn();
    render(<ExamRecap {...baseProps} onDrillWeak={onDrillWeak} />);
    expect(await screen.findByText(/Drill these 1/)).toBeTruthy();
    cleanup();
    render(<ExamRecap {...baseProps} weakTopics={[]} onDrillWeak={onDrillWeak} />);
    expect(screen.queryByText(/Drill these/)).toBeNull();
  });

  it("lists at most three mistakes from this attempt, and none from before it", async () => {
    (window as unknown as Record<string, unknown>).getMistakes = () => [
      { id: "m1", at: 5_000, question: "Q1", topic: "T", options: ["a", "b"], correctIndex: 1 },
      { id: "m2", at: 4_000, question: "Q2", topic: "T", options: ["a", "b"], correctIndex: 0 },
      { id: "m3", at: 3_000, question: "Q3", topic: "T", options: ["a", "b"], correctIndex: 0 },
      { id: "m4", at: 2_000, question: "Q4", topic: "T", options: ["a", "b"], correctIndex: 0 },
      { id: "old", at: 500, question: "FromBefore", topic: "T", options: ["a", "b"], correctIndex: 0 },
    ];
    render(<ExamRecap {...baseProps} />);
    expect(await screen.findByText("Q1")).toBeTruthy();
    expect(screen.getByText("Q3")).toBeTruthy();
    expect(screen.queryByText("Q4")).toBeNull();
    expect(screen.queryByText("FromBefore")).toBeNull();
  });

  it("renders the score even when the coach comment fails to generate", async () => {
    render(<ExamRecap {...baseProps} />);
    expect(await screen.findByText("180")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("🤖 Coach's read")).toBeNull());
  });

  it("shows the coach comment when generation succeeds", async () => {
    (window as unknown as Record<string, unknown>).brainComplete = () =>
      Promise.resolve("Solid pass. Drill trigonometry next.");
    render(<ExamRecap {...baseProps} />);
    expect(await screen.findByText("Solid pass. Drill trigonometry next.")).toBeTruthy();
  });

  it("renders the per-question review when the engine supplies one", async () => {
    render(
      <ExamRecap
        {...baseProps}
        review={[{ question: "2+2?", options: ["3", "4"], correct: 1, selected: 0, explanation: "It is 4." }]}
      />,
    );
    expect(await screen.findByText("1. 2+2?")).toBeTruthy();
    expect(screen.getByText(/Your answer: 3/)).toBeTruthy();
    expect(screen.getByText(/Correct/)).toBeTruthy();
  });
});
