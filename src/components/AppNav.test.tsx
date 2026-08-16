/**
 * Tabs on the bar, including Tools. More sheet must not come back.
 */
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

  it("has no More sheet", () => {
    expect(src).not.toMatch(/app-nav-more-sheet|MORE_TABS/);
    expect(src).toMatch(/app-nav-hamburger/);
  });

  it("renders Today Coach Learn Tools Journal Calendar Exams Settings", () => {
    render(
      <AppNav
        current="dashboard"
        onNavigate={() => {}}
        onLogout={() => {}}
        lang="en"
        onLangChange={() => {}}
      />,
    );
    for (const name of ["Today", "Coach", "Learn", "Tools", "Journal", "Calendar", "Exams", "Settings"]) {
      expect(screen.getAllByRole("button", { name }).length).toBeGreaterThan(0);
    }
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
