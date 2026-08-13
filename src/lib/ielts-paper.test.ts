import { describe, expect, it } from "vitest";
import {
  answersMatch,
  IELTS_READING,
  IELTS_WRITING,
  isIeltsReadingTopic,
  isIeltsWritingTopic,
  normalizeTfng,
  snapBand,
  wordCount,
} from "./ielts-paper";

describe("paper shapes", () => {
  it("Practice is one section; Exam Sim is the full clock", () => {
    expect(IELTS_READING.practice).toEqual({ passages: 1, questions: 10, minutes: 20 });
    expect(IELTS_READING.exam).toEqual({ passages: 3, questions: 40, minutes: 60 });
    expect(IELTS_WRITING.practice).toEqual({ tasks: 1, minutes: 20 });
    expect(IELTS_WRITING.exam).toEqual({ tasks: 2, minutes: 60 });
  });
});

describe("section detectors", () => {
  it("flags IELTS Reading only", () => {
    expect(isIeltsReadingTopic("Reading", "ielts")).toBe(true);
    expect(isIeltsReadingTopic("Читання", "ielts")).toBe(true);
    expect(isIeltsReadingTopic("Listening", "ielts")).toBe(false);
    expect(isIeltsReadingTopic("Reading", "nmt")).toBe(false);
  });

  it("flags IELTS Writing only", () => {
    expect(isIeltsWritingTopic("Writing", "ielts")).toBe(true);
    expect(isIeltsWritingTopic("Письмо", "ielts")).toBe(true);
    expect(isIeltsWritingTopic("Reading", "ielts")).toBe(false);
  });
});

describe("answer helpers", () => {
  it("normalises TFNG labels", () => {
    expect(normalizeTfng("Not Given")).toBe("ng");
    expect(normalizeTfng("TRUE")).toBe("true");
    expect(normalizeTfng("nope")).toBeNull();
  });

  it("matches fill answers loosely", () => {
    expect(answersMatch("9 am", "9am", ["09:00"])).toBe(true);
    expect(answersMatch("library", "the library")).toBe(true);
    expect(answersMatch("park", "library")).toBe(false);
  });

  it("snaps bands to half steps", () => {
    expect(snapBand(6.3)).toBe(6.5);
    expect(snapBand(6.2)).toBe(6.0);
  });

  it("counts words", () => {
    expect(wordCount("  one two  three ")).toBe(3);
    expect(wordCount("")).toBe(0);
  });
});
