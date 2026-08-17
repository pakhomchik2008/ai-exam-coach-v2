import { describe, expect, it } from "vitest";
import { weeklyDeepReportHtml } from "../../api/notifications-cron.js";

describe("weeklyDeepReportHtml", () => {
  it("shows the exam name, probability, and an ULTRA marker", () => {
    const html = weeklyDeepReportHtml("IELTS", 74, ["Listening"], "Good pace, keep it up.");
    expect(html).toContain("IELTS");
    expect(html).toContain("74%");
    expect(html).toContain("ULTRA");
    expect(html).toContain("Good pace, keep it up.");
  });

  it("renders a bar per weak topic, widest first", () => {
    const html = weeklyDeepReportHtml("SAT", 50, ["Algebra", "Geometry"], null);
    expect(html).toContain("Algebra");
    expect(html).toContain("Geometry");
    expect(html).toContain("width:100%");
    expect(html).toContain("width:75%");
  });

  it("says nothing false when there are no weak topics", () => {
    const html = weeklyDeepReportHtml("SAT", 90, [], null);
    expect(html).toContain("No recurring weak topics this week.");
  });

  it("omits the commentary paragraph when the AI call failed (null)", () => {
    const html = weeklyDeepReportHtml("SAT", 60, [], null);
    // No stray "null" or empty <p></p> leaking into the email.
    expect(html).not.toContain("null");
  });
});
