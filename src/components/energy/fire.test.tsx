import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MissionRing, XPBar } from "./fire";

describe("dashboard fire", () => {
  it("renders mission percent", () => {
    render(<MissionRing percent={40} label="Today" />);
    expect(screen.getByLabelText("Today")).toBeInTheDocument();
  });

  it("renders XP into/need", () => {
    render(<XPBar into={25} need={100} level={2} />);
    expect(screen.getByText("25/100 XP")).toBeInTheDocument();
    expect(screen.getByText("LV 2")).toBeInTheDocument();
  });
});
