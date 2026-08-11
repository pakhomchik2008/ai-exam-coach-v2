/**
 * Audit bug #8 — the exam wizard asked "when are you unavailable" as a 7-day x
 * 3-period grid (21 toggles) before the student had finished signing up.
 *
 * The grid itself is not deleted: it stays in Settings for anyone who actually
 * wants to block out Friday evenings. It is only suppressed in the wizard, via
 * `showBlackout={false}`. These tests pin both halves of that down — dropping
 * the prop, or defaulting it the wrong way, breaks one of them.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { legacyComponent } from "../../lib/legacy";
import "../../bootstrap";

const AvailabilityGrid = legacyComponent<Record<string, unknown>>("AvailabilityGrid");

const copy = {
  s2_days_per_week: "Days per week",
  s2_session_length: "Session length",
  s2_when_unavailable: "When are you unavailable",
  all_day: "All day",
  day_abbr: { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" },
  period_abbr: { morning: "AM", afternoon: "PM", evening: "Eve" },
};

function renderGrid(props: Record<string, unknown> = {}) {
  return render(
    <AvailabilityGrid
      daysPerWeek={5}
      setDaysPerWeek={() => {}}
      sessionLengthMin={45}
      setSessionLengthMin={() => {}}
      blackoutSlots={[]}
      setBlackoutSlots={() => {}}
      copy={copy}
      {...props}
    />,
  );
}

describe("AvailabilityGrid", () => {
  it("shows the blackout grid by default (the Settings case)", () => {
    renderGrid();
    expect(screen.getByText(copy.s2_when_unavailable)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: copy.all_day })).toHaveLength(7);
  });

  it("hides the blackout grid when showBlackout is false (the wizard case)", () => {
    renderGrid({ showBlackout: false });
    expect(screen.queryByText(copy.s2_when_unavailable)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: copy.all_day })).not.toBeInTheDocument();
  });

  it("keeps days-per-week and session-length in both modes — the scheduler needs them", () => {
    const { unmount } = renderGrid({ showBlackout: false });
    expect(screen.getByText(copy.s2_days_per_week)).toBeInTheDocument();
    expect(screen.getByText(copy.s2_session_length)).toBeInTheDocument();
    unmount();

    renderGrid({ showBlackout: true });
    expect(screen.getByText(copy.s2_days_per_week)).toBeInTheDocument();
    expect(screen.getByText(copy.s2_session_length)).toBeInTheDocument();
  });
});
