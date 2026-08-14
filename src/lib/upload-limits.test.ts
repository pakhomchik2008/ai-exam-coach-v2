import { describe, it, expect } from "vitest";
import {
  STUDY_LIMITS,
  CHAT_LIMITS,
  MAX_FILES,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  ACCEPT_ATTRIBUTE,
  isAcceptedType,
  validateFiles,
  formatBytes,
  rejectionMessage,
  rejectionSummary,
  type FileLike,
} from "./upload-limits";

const MB = 1024 * 1024;
const file = (name: string, mb = 1): FileLike => ({ name, size: mb * MB });

describe("limits match the spec", () => {
  it("caps at 20 files, 25 MB each, 200 MB total", () => {
    expect(MAX_FILES).toBe(20);
    expect(MAX_FILE_BYTES).toBe(25 * MB);
    expect(MAX_TOTAL_BYTES).toBe(200 * MB);
  });

  it("offers an accept attribute covering the documented types", () => {
    for (const ext of [".pdf", ".docx", ".jpg", ".png", ".txt", ".xlsx", ".md", ".webp"]) {
      expect(ACCEPT_ATTRIBUTE).toContain(ext);
    }
    expect(ACCEPT_ATTRIBUTE).toContain("application/pdf");
    expect(ACCEPT_ATTRIBUTE).toContain("image/*");
  });
});

describe("isAcceptedType", () => {
  it.each([
    "notes.pdf",
    "essay.docx",
    "deck.pptx",
    "photo.JPG",
    "scan.PNG",
    "raw.txt",
    "sheet.xlsx",
    "notes.md",
    "data.csv",
    "handout.rtf",
    "page.webp",
    "scan.gif",
    "brief.odt",
  ])("accepts %s", (name) => expect(isAcceptedType(name)).toBe(true));

  it.each(["virus.exe", "archive.zip", "clip.mp4", "noextension", "script.js", "page.svg"])(
    "rejects %s",
    (name) => expect(isAcceptedType(name)).toBe(false),
  );

  it("accepts a nameless PDF by MIME type", () => {
    expect(isAcceptedType("untitled", "application/pdf")).toBe(true);
    expect(validateFiles([{ name: "untitled", size: 1024, type: "application/pdf" }]).accepted).toHaveLength(1);
  });

  it("accepts a nameless photo by MIME type", () => {
    expect(isAcceptedType("image", "image/jpeg")).toBe(true);
    expect(isAcceptedType("image", "image/svg+xml")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isAcceptedType("Notes.PDF")).toBe(true);
  });

  // "report.pdf.exe" must be judged on its real extension, not the one in the
  // middle of the name.
  it("uses the final extension, not an embedded one", () => {
    expect(isAcceptedType("report.pdf.exe")).toBe(false);
  });
});

describe("validateFiles", () => {
  it("accepts a normal batch", () => {
    const { accepted, rejected } = validateFiles([file("a.pdf"), file("b.docx")]);
    expect(accepted).toHaveLength(2);
    expect(rejected).toEqual([]);
  });

  it("rejects an unsupported type and keeps the rest", () => {
    const { accepted, rejected } = validateFiles([file("a.pdf"), file("b.exe"), file("c.png")]);
    expect(accepted.map((f) => f.name)).toEqual(["a.pdf", "c.png"]);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.reason).toBe("unsupported-type");
  });

  it("rejects a file over the per-file cap", () => {
    const { accepted, rejected } = validateFiles([file("huge.pdf", 26)]);
    expect(accepted).toEqual([]);
    expect(rejected[0]!.reason).toBe("file-too-large");
  });

  it("accepts a file exactly at the per-file cap", () => {
    const { accepted } = validateFiles([{ name: "edge.pdf", size: MAX_FILE_BYTES }]);
    expect(accepted).toHaveLength(1);
  });

  it("stops at the file-count cap", () => {
    const batch = Array.from({ length: 25 }, (_, i) => file(`f${i}.pdf`, 0.1));
    const { accepted, rejected } = validateFiles(batch);
    expect(accepted).toHaveLength(MAX_FILES);
    expect(rejected).toHaveLength(5);
    expect(rejected.every((r) => r.reason === "too-many-files")).toBe(true);
  });

  it("counts files already attached toward the cap", () => {
    const existing = Array.from({ length: 19 }, (_, i) => file(`old${i}.pdf`, 0.1));
    const { accepted, rejected } = validateFiles([file("new1.pdf"), file("new2.pdf")], existing);
    expect(accepted).toHaveLength(1);
    expect(rejected[0]!.reason).toBe("too-many-files");
  });

  it("enforces the running total across a batch", () => {
    // 9 x 24 MB = 216 MB, over the 200 MB total but each under the per-file cap.
    const batch = Array.from({ length: 9 }, (_, i) => file(`big${i}.pdf`, 24));
    const { accepted, rejected } = validateFiles(batch);
    const total = accepted.reduce((sum, f) => sum + f.size, 0);
    expect(total).toBeLessThanOrEqual(MAX_TOTAL_BYTES);
    expect(rejected.some((r) => r.reason === "total-too-large")).toBe(true);
  });

  it("counts existing bytes toward the total", () => {
    const existing = [{ name: "old.pdf", size: 190 * MB }];
    const { accepted, rejected } = validateFiles([file("new.pdf", 20)], existing);
    expect(accepted).toEqual([]);
    expect(rejected[0]!.reason).toBe("total-too-large");
  });

  // An oversized .exe should be reported as the wrong *kind* of file, which is
  // the actionable message, rather than as being too big.
  it("reports the first applicable reason", () => {
    const { rejected } = validateFiles([{ name: "bad.exe", size: 40 * MB }]);
    expect(rejected[0]!.reason).toBe("unsupported-type");
  });

  it("handles an empty batch", () => {
    expect(validateFiles([])).toEqual({ accepted: [], rejected: [] });
  });

  it("preserves input order in the accepted list", () => {
    const { accepted } = validateFiles([file("c.pdf"), file("a.pdf"), file("b.pdf")]);
    expect(accepted.map((f) => f.name)).toEqual(["c.pdf", "a.pdf", "b.pdf"]);
  });
});

describe("formatBytes", () => {
  it.each([
    [512, "512 B"],
    [2048, "2 KB"],
    [5 * MB, "5.0 MB"],
    [25 * MB, "25 MB"],
  ])("formats %i as %s", (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});

describe("messages", () => {
  it("names the offending file", () => {
    const msg = rejectionMessage({ file: file("lecture.exe"), reason: "unsupported-type" });
    expect(msg).toContain("lecture.exe");
  });

  it("states the actual limit for an oversized file", () => {
    const msg = rejectionMessage({ file: file("huge.pdf", 40), reason: "file-too-large" });
    expect(msg).toContain("25 MB");
    expect(msg).toContain("40 MB");
  });

  it.each(["en", "uk", "ru", "fr", "de"])("has a %s translation", (lang) => {
    const msg = rejectionMessage({ file: file("a.exe"), reason: "unsupported-type" }, lang);
    expect(msg.length).toBeGreaterThan(0);
  });

  it("falls back to English for an unknown language", () => {
    const msg = rejectionMessage({ file: file("a.exe"), reason: "unsupported-type" }, "zz");
    expect(msg).toContain("unsupported");
  });

  it("summarises a batch without listing every file", () => {
    const rejected = [
      { file: file("a.exe"), reason: "unsupported-type" as const },
      { file: file("b.exe"), reason: "unsupported-type" as const },
      { file: file("c.exe"), reason: "unsupported-type" as const },
    ];
    const summary = rejectionSummary(rejected);
    expect(summary).toContain("a.exe");
    expect(summary).toContain("2");
    expect(summary).not.toContain("c.exe");
  });

  it("returns an empty string when nothing was rejected", () => {
    expect(rejectionSummary([])).toBe("");
  });
});

describe("per-surface limit presets", () => {
  it("uses 20 files / 25 MB for study material", () => {
    expect(STUDY_LIMITS).toEqual({
      maxFiles: 20,
      maxFileBytes: 25 * MB,
      maxTotalBytes: 200 * MB,
    });
  });

  // Chat attachments are re-sent with the whole conversation on every turn, so
  // the cap has to be tighter than the one-shot study upload.
  it("uses a tighter 5 files / 10 MB for chat", () => {
    expect(CHAT_LIMITS).toEqual({
      maxFiles: 5,
      maxFileBytes: 10 * MB,
      maxTotalBytes: 50 * MB,
    });
    expect(CHAT_LIMITS.maxFiles).toBeLessThan(STUDY_LIMITS.maxFiles);
    expect(CHAT_LIMITS.maxFileBytes).toBeLessThan(STUDY_LIMITS.maxFileBytes);
  });

  it("applies the chat cap when asked", () => {
    const batch = Array.from({ length: 8 }, (_, i) => file(`f${i}.pdf`, 0.1));
    const { accepted, rejected } = validateFiles(batch, [], CHAT_LIMITS);
    expect(accepted).toHaveLength(5);
    expect(rejected).toHaveLength(3);
  });

  it("rejects a 12 MB file in chat that study would accept", () => {
    const big = [file("scan.pdf", 12)];
    expect(validateFiles(big, [], CHAT_LIMITS).rejected[0]!.reason).toBe("file-too-large");
    expect(validateFiles(big, [], STUDY_LIMITS).accepted).toHaveLength(1);
  });

  it("quotes the chat limit, not the study one, in its message", () => {
    const msg = rejectionMessage(
      { file: file("scan.pdf", 12), reason: "file-too-large" },
      "en",
      CHAT_LIMITS,
    );
    expect(msg).toContain("10 MB");
    expect(msg).not.toContain("25 MB");
  });
});
