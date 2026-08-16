/**
 * Chrome contract: one header, one primary, empty names the next tap.
 */
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EmptyState, PageHeader, PrimaryButton } from "./PageHeader";

describe("PageHeader", () => {
  it("is a title plus at most one action", () => {
    render(<PageHeader title="Today" action={<PrimaryButton>Start</PrimaryButton>} />);
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toHaveClass("app-btn-primary");
  });
});

describe("EmptyState", () => {
  it("names the next tap", () => {
    render(
      <EmptyState
        title="Learn"
        body="Add an exam — More → Exams."
        actionLabel="Add an exam"
        onAction={() => {}}
      />,
    );
    expect(screen.getByText("Add an exam — More → Exams.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add an exam" })).toHaveClass("app-btn-primary");
  });
});

describe("app chrome sources", () => {
  it("nav is paper, not glass", () => {
    const nav = readFileSync("src/components/AppNav.jsx", "utf8");
    expect(nav).toMatch(/className="app-nav"/);
    expect(nav).not.toMatch(/backdropFilter/);
  });

  it("does not restyle AIChat", () => {
    const chat = readFileSync("src/features/chat/AIChat.jsx", "utf8");
    expect(chat).not.toMatch(/PageHeader|app-btn-primary|app-page-header/);
  });
});
