import { describe, it, expect } from "vitest";
import { describeAiError } from "./ai-error";

describe("describeAiError", () => {
  it("surfaces a specific server message when status is present", () => {
    const err = { status: 400, message: "Payload too large (5000000 chars, max 4000000)" };
    expect(describeAiError(err)).toBe("Payload too large (5000000 chars, max 4000000)");
  });

  it("surfaces a quota message from a 429", () => {
    const err = { status: 429, message: "Daily AI limit reached. It resets at 00:00 UTC." };
    expect(describeAiError(err)).toBe("Daily AI limit reached. It resets at 00:00 UTC.");
  });

  it("surfaces an auth message from a 401", () => {
    const err = { status: 401, message: "Sign in to use AI features." };
    expect(describeAiError(err)).toBe("Sign in to use AI features.");
  });

  // A bare network failure (offline, DNS failure, fetch rejecting before any
  // response) has no status at all — that is the one truly unknown case.
  it("falls back to a generic message when there is no status", () => {
    expect(describeAiError(new TypeError("Failed to fetch"))).toContain("Connection hiccup");
  });

  it("falls back for a status with no message", () => {
    expect(describeAiError({ status: 500 })).toContain("Connection hiccup");
  });

  it.each(["en", "uk", "ru", "fr", "de"])("has a %s generic fallback", (lang) => {
    const msg = describeAiError({}, lang);
    expect(msg.length).toBeGreaterThan(0);
  });

  it("falls back to English for an unknown language", () => {
    expect(describeAiError({}, "zz")).toContain("Connection hiccup");
  });

  it.each([null, undefined, "a string", 42])("handles a non-object error %p", (bad) => {
    expect(() => describeAiError(bad)).not.toThrow();
    expect(describeAiError(bad)).toContain("Connection hiccup");
  });
});
