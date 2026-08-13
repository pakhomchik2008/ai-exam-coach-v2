import { describe, expect, it } from "vitest";
import {
  dropIeltsSpeakingTopics,
  isIeltsListeningTopic,
  isIeltsSpeakingTopic,
} from "./ielts-listen";

describe("isIeltsListeningTopic", () => {
  it("is true only for IELTS Listening", () => {
    expect(isIeltsListeningTopic("Listening", "ielts")).toBe(true);
    expect(isIeltsListeningTopic("Аудіювання", "ielts")).toBe(true);
    expect(isIeltsListeningTopic("Listening for specific detail", "ielts")).toBe(true);
    expect(isIeltsListeningTopic("Listening", "nmt")).toBe(false);
    expect(isIeltsListeningTopic("Reading", "ielts")).toBe(false);
  });
});

describe("isIeltsSpeakingTopic", () => {
  it("catches the Speaking section and leaves the other papers", () => {
    expect(isIeltsSpeakingTopic("Speaking", "ielts")).toBe(true);
    expect(isIeltsSpeakingTopic("Говоріння", "ielts")).toBe(true);
    expect(isIeltsSpeakingTopic("Cue card strategies", "ielts")).toBe(true);
    expect(isIeltsSpeakingTopic("Writing", "ielts")).toBe(false);
    expect(isIeltsSpeakingTopic("Speaking", "toefl")).toBe(false);
  });
});

describe("dropIeltsSpeakingTopics", () => {
  it("strips Speaking from an IELTS topic list", () => {
    const kept = dropIeltsSpeakingTopics(
      ["Listening", "Reading", "Writing", "Speaking"],
      (n) => n,
      "ielts",
    );
    expect(kept).toEqual(["Listening", "Reading", "Writing"]);
  });
});
