/**
 * Desktop: flat tabs on the bar, including Tools. Mobile: a 4-tab bottom
 * bar (Dashboard/Coach/Learn/Tools) + a "More" sheet for the rest — the
 * classic iOS pattern, chosen deliberately over the flat mobile dropdown
 * this file used to have (that decision predates the bottom bar; the CSS
 * media query is what actually switches between the two layouts, not JS).
 */
import { readFileSync } from "node:fs";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "../bootstrap";

const AppNav = (window as unknown as {
  AppNav: (props: {
    current: string;
    onNavigate: (id: string) => void;
    onLogout: () => void;
    lang: string;
    onLangChange: (code: string) => void;
  }) => React.ReactElement;
}).AppNav;

describe("AppNav tabs", () => {
  const src = readFileSync("src/components/AppNav.jsx", "utf8");

  it("logo is the horizontal lockup, not a framed tile", () => {
    expect(src).toMatch(/<BrandLockup/);
    expect(src).not.toMatch(/framed=/);
  });

  it("bottom bar carries the 4 daily rooms plus More; the rest live in the More sheet", () => {
    expect(src).toMatch(/app-nav-bottom-bar/);
    expect(src).toMatch(/app-nav-more-sheet/);
  });

  it("renders Dashboard Coach Learn Tools Journal Calendar Exams Settings", () => {
    render(
      <AppNav
        current="dashboard"
        onNavigate={() => {}}
        onLogout={() => {}}
        lang="en"
        onLangChange={() => {}}
      />,
    );
    for (const name of ["Dashboard", "Coach", "Learn", "Tools", "Journal", "Calendar", "Exams", "Settings"]) {
      expect(screen.getAllByRole("button", { name }).length).toBeGreaterThan(0);
    }
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("More sheet opens on tap and its links still navigate", () => {
    const onNavigate = vi.fn();
    render(
      <AppNav
        current="dashboard"
        onNavigate={onNavigate}
        onLogout={() => {}}
        lang="en"
        onLangChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    const journalButtons = screen.getAllByRole("button", { name: "Journal" });
    fireEvent.click(journalButtons[0] as HTMLElement);
    expect(onNavigate).toHaveBeenCalledWith("journal");
  });
});
