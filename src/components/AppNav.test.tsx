/**
 * Four rooms on the bar. More is a sheet, not a fifth destination.
 * Seven-item collapse must not come back.
 */
import { readFileSync } from "node:fs";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import "../bootstrap";
import { MORE_TABS } from "./AppNav.jsx";

const AppNav = (window as unknown as {
  AppNav: (props: {
    current: string;
    onNavigate: (id: string) => void;
    onLogout: () => void;
    lang: string;
    onLangChange: (code: string) => void;
  }) => React.ReactElement;
}).AppNav;

describe("AppNav four rooms", () => {
  const src = readFileSync("src/components/AppNav.jsx", "utf8");

  it("More owns overflow routes including legacy schedule", () => {
    expect([...MORE_TABS]).toEqual([
      "calendar", "schedule", "exams", "journal", "studyhub", "progress", "settings",
    ]);
  });

  it("logo is the horizontal lockup, not a framed tile", () => {
    expect(src).toMatch(/<BrandLockup/);
    expect(src).not.toMatch(/framed/);
  });

  it("has no seven-item collapse menu", () => {
    expect(src).not.toMatch(/app-nav-hamburger|app-nav-mobile-panel/);
    expect(src).toMatch(/nav_more/);
    expect(src).toMatch(/nav_today/);
  });

  it("keeps logout inside More, not as a fifth pill", () => {
    expect(src).toMatch(/NavLogoutButton/);
    expect(src).toMatch(/app-nav-more-sheet/);
  });

  it("renders Today Learn Coach More and opens the overflow sheet", () => {
    const onNavigate = (id: string) => { last = id; };
    let last = "";
    render(
      <AppNav
        current="dashboard"
        onNavigate={onNavigate}
        onLogout={() => {}}
        lang="en"
        onLangChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Learn" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Coach" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Calendar" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("dialog", { name: "More" })).toHaveAttribute("aria-modal", "true");
    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    expect(last).toBe("calendar");
  });

  it("closes More on Escape and does not treat More as a page", () => {
    render(
      <AppNav
        current="dashboard"
        onNavigate={() => {}}
        onLogout={() => {}}
        lang="en"
        onLangChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("dialog", { name: "More" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "More" })).toBeNull();
    expect(screen.getByRole("button", { name: "More" })).not.toHaveAttribute("aria-current");
  });

  it("marks More current on overflow routes", () => {
    render(
      <AppNav
        current="settings"
        onNavigate={() => {}}
        onLogout={() => {}}
        lang="en"
        onLangChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "More" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Today" })).not.toHaveAttribute("aria-current");
  });
});
