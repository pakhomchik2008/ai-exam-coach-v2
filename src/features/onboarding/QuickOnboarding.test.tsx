import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { QuickOnboarding } from "./QuickOnboarding";

type Dict = Record<string, unknown>;
const w = () => window as unknown as Dict;

interface CapturedCommit {
  examDrafts: Record<string, unknown>[];
  profilePatch: Record<string, unknown>;
}

let commits: CapturedCommit[] = [];
let upgradeCalls: Record<string, unknown>[] = [];
let startDemoCalls = 0;

const EXAM_TYPES = [
  {
    id: "nmt", label: "NMT", emoji: "🇺🇦", board: "UCEQA",
    blurb: { en: "NMT · 100–200" },
    grade: { kind: "score", min: 100, max: 200, step: 1, current: 145, target: 180 },
  },
  {
    id: "gcse", label: "GCSE", emoji: "🇬🇧", board: "AQA",
    blurb: { en: "9–1 grading" },
    grade: { kind: "scale", options: ["9", "8", "7", "6"], current: "6", target: "8" },
  },
];

beforeEach(() => {
  commits = [];
  upgradeCalls = [];
  startDemoCalls = 0;
  w().EXAM_TYPES = EXAM_TYPES;
  w().examType = (id: string) => EXAM_TYPES.find((e) => e.id === id) ?? EXAM_TYPES[0];
  w().commitExamWizard = (arg: CapturedCommit) => {
    commits.push(arg);
    return [{ id: "e_new" }];
  };
  w().getSchedule = () => ({ sessions: [{ examId: "e_new", durationMin: 60 }, { examId: "e_new", durationMin: 60 }] });
  w().getSession = () => null;
  w().startDemo = () => { startDemoCalls++; return Promise.resolve(null); };
  w().upgradeAnonymousAccount = (a: Record<string, unknown>) => {
    upgradeCalls.push(a);
    return Promise.resolve({ emailPending: false });
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderIt(onFinish = vi.fn()) {
  render(<QuickOnboarding onFinish={onFinish} lang="en" />);
  return onFinish;
}

const clickText = (re: RegExp | string) => fireEvent.click(screen.getByText(re));
const continueBtn = () => screen.getByText(/Continue/).closest("button") as HTMLButtonElement;

/** exam → date → target → hours, leaving the account step on screen. */
function advanceToAccountStep(qual = "NMT") {
  clickText(qual);
  fireEvent.change(screen.getByPlaceholderText(/Subject/), { target: { value: "Mathematics" } });
  fireEvent.click(continueBtn()); // → date
  fireEvent.click(continueBtn()); // → target
  fireEvent.click(continueBtn()); // → hours
  fireEvent.click(continueBtn()); // → account
}

describe("QuickOnboarding", () => {
  it("starts an anonymous session so the steps before signup can use the AI", () => {
    renderIt();
    expect(startDemoCalls).toBe(1);
  });

  it("does not start a second session when one already exists", () => {
    w().getSession = () => ({ id: "u1" });
    renderIt();
    expect(startDemoCalls).toBe(0);
  });

  it("blocks the first step until both a qualification and a subject are given", () => {
    renderIt();
    expect(continueBtn().disabled).toBe(true);
    clickText("NMT");
    expect(continueBtn().disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText(/Subject/), { target: { value: "Mathematics" } });
    expect(continueBtn().disabled).toBe(false);
  });

  it("offers the target on the qualification's own scale, not a generic percentage", () => {
    renderIt();
    clickText("GCSE");
    fireEvent.change(screen.getByPlaceholderText(/Subject/), { target: { value: "Maths" } });
    fireEvent.click(continueBtn());
    fireEvent.click(continueBtn());
    // GCSE is a 9–1 scale — grade chips, no slider.
    expect(screen.getByText("9")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy();
  });

  it("commits the plan on reaching the account step, before any signup", () => {
    renderIt();
    advanceToAccountStep();
    expect(commits).toHaveLength(1);
    expect(screen.getByText(/Save your plan/)).toBeTruthy();
  });

  it("stores hours as weekly hours, multiplied by the days actually chosen", () => {
    renderIt();
    advanceToAccountStep();
    // Defaults are 2 hours/day across 5 days.
    expect(commits[0]?.profilePatch.weeklyHours).toBe(10);
    expect(commits[0]?.profilePatch.daysPerWeek).toBe(5);
  });

  it("keeps the qualification on the exam so its scale and format resolve later", () => {
    renderIt();
    advanceToAccountStep();
    expect(commits[0]?.examDrafts[0]?.qualificationId).toBe("nmt");
    expect(commits[0]?.examDrafts[0]?.targetGrade).toBe("180");
  });

  it("prefixes the subject with the qualification label", () => {
    renderIt();
    advanceToAccountStep();
    expect(commits[0]?.examDrafts[0]?.name).toBe("NMT Mathematics");
  });

  it("upgrades the anonymous session rather than creating a second account", async () => {
    renderIt();
    advanceToAccountStep();
    fireEvent.change(screen.getByPlaceholderText(/Your name/), { target: { value: "Hlib" } });
    fireEvent.change(screen.getByPlaceholderText(/^Email$/), { target: { value: "h@example.com" } });
    fireEvent.change(screen.getByPlaceholderText(/Password/), { target: { value: "hunter22" } });
    clickText(/Create account/);
    await waitFor(() => expect(upgradeCalls).toHaveLength(1));
    expect(upgradeCalls[0]?.email).toBe("h@example.com");
  });

  it("rejects a short password before calling the auth layer at all", async () => {
    renderIt();
    advanceToAccountStep();
    fireEvent.change(screen.getByPlaceholderText(/^Email$/), { target: { value: "h@example.com" } });
    fireEvent.change(screen.getByPlaceholderText(/Password/), { target: { value: "abc" } });
    clickText(/Create account/);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(upgradeCalls).toHaveLength(0);
  });

  it("rejects a malformed email before calling the auth layer", async () => {
    renderIt();
    advanceToAccountStep();
    fireEvent.change(screen.getByPlaceholderText(/^Email$/), { target: { value: "not-an-email" } });
    fireEvent.change(screen.getByPlaceholderText(/Password/), { target: { value: "hunter22" } });
    clickText(/Create account/);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(upgradeCalls).toHaveLength(0);
  });

  it("lets the student skip signup and still reach a real plan", async () => {
    const onFinish = renderIt();
    advanceToAccountStep();
    clickText(/Skip for now/);
    expect(await screen.findByText(/Your plan is ready/, {}, { timeout: 3000 })).toBeTruthy();
    // 2 seeded sessions, 60 min each — so "2 sessions" and "2 hours total",
    // both read back from the schedule the commit actually produced.
    expect(screen.getByText(/study sessions/)).toBeTruthy();
    expect(screen.getByText(/hours total/)).toBeTruthy();
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByText(/Start studying/).closest("button") as HTMLButtonElement);
    expect(onFinish).toHaveBeenCalledWith([{ id: "e_new" }]);
    expect(upgradeCalls).toHaveLength(0);
  });

  it("does not commit a second exam when the plan is reached twice", async () => {
    renderIt();
    advanceToAccountStep();
    clickText(/Skip for now/);
    await screen.findByText(/Your plan is ready/, {}, { timeout: 3000 });
    expect(commits).toHaveLength(1);
  });

  it("goes back without losing what was already entered", () => {
    renderIt();
    clickText("NMT");
    fireEvent.change(screen.getByPlaceholderText(/Subject/), { target: { value: "Mathematics" } });
    fireEvent.click(continueBtn());
    clickText(/Back/);
    expect((screen.getByPlaceholderText(/Subject/) as HTMLInputElement).value).toBe("Mathematics");
  });
});
