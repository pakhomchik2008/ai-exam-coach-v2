import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WaitPress } from "./WaitPress";

describe("WaitPress", () => {
  it("shows the wait title", () => {
    render(<WaitPress title="Generating your exam..." lang="en" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Generating your exam...");
    expect(screen.getByText("Generating your exam...")).toBeInTheDocument();
  });
});
