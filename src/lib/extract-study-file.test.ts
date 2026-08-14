import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import {
  extractStudyFile,
  toClaudeBlocks,
  describeStudyFileError,
  StudyFileError,
  TEXT_CHAR_CAP,
  type ExtractedStudyFile,
} from "./extract-study-file";

function asFile(name: string, data: BlobPart, type = ""): File {
  return new File([data], name, type ? { type } : undefined);
}

async function zipFile(name: string, files: Record<string, string>, type = ""): Promise<File> {
  const zip = new JSZip();
  for (const [path, body] of Object.entries(files)) zip.file(path, body);
  const blob = await zip.generateAsync({ type: "blob" });
  return asFile(name, blob, type);
}

function docText(out: ExtractedStudyFile[]): string {
  const item = out[0];
  if (!item || item.kind !== "doc") throw new Error("expected a text document");
  return item.text;
}

describe("extractStudyFile text formats", () => {
  it("reads a txt file", async () => {
    const out = await extractStudyFile(asFile("notes.txt", "Quadratic formula: x = (-b ± sqrt(b²-4ac)) / 2a", "text/plain"));
    expect(docText(out)).toContain("Quadratic formula");
  });

  it("reads markdown and csv", async () => {
    const md = await extractStudyFile(asFile("a.md", "# Photosynthesis\nLight reactions"));
    const csv = await extractStudyFile(asFile("scores.csv", "topic,score\nalgebra,12"));
    expect(docText(md)).toContain("Photosynthesis");
    expect(docText(csv)).toContain("algebra");
  });

  it("strips rtf control words", async () => {
    const text = docText(await extractStudyFile(asFile("a.rtf", "{\\rtf1\\ansi Hello \\b world}")));
    expect(text).toContain("Hello");
    expect(text).toContain("world");
    expect(text).not.toContain("\\rtf");
  });

  it("strips html tags", async () => {
    const text = docText(await extractStudyFile(asFile("a.html", "<h1>Mitosis</h1><script>alert(1)</script><p>cell division</p>")));
    expect(text).toContain("Mitosis");
    expect(text).toContain("cell division");
    expect(text).not.toContain("alert");
  });

  it("caps extracted text", async () => {
    const text = docText(await extractStudyFile(asFile("huge.txt", "word ".repeat(TEXT_CHAR_CAP))));
    expect(text.length).toBeLessThanOrEqual(TEXT_CHAR_CAP);
  });
});

describe("extractStudyFile office", () => {
  it("pulls text out of a docx zip", async () => {
    const file = await zipFile("essay.docx", {
      "word/document.xml": `<?xml version="1.0"?><w:document><w:t>Newton's second law</w:t></w:document>`,
    });
    expect(docText(await extractStudyFile(file))).toContain("Newton's second law");
  });

  it("pulls shared strings out of xlsx", async () => {
    const file = await zipFile("sheet.xlsx", {
      "xl/sharedStrings.xml": `<sst><si><t>Mitochondria</t></si><si><t>ATP</t></si></sst>`,
      "xl/worksheets/sheet1.xml": `<worksheet><v>1</v><v>2</v></worksheet>`,
    });
    const text = docText(await extractStudyFile(file));
    expect(text).toContain("Mitochondria");
    expect(text).toContain("ATP");
  });

  it("rejects OLE .doc with a save-as-docx message", async () => {
    const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 1, 2, 3]);
    await expect(extractStudyFile(asFile("old.doc", ole))).rejects.toBeInstanceOf(StudyFileError);
    try {
      await extractStudyFile(asFile("old.doc", ole));
    } catch (err) {
      expect(err).toBeInstanceOf(StudyFileError);
      expect((err as StudyFileError).code).toBe("ole-legacy");
      expect(describeStudyFileError(err, "old.doc", "en")).toMatch(/docx/i);
    }
  });

  it("reads odt content.xml", async () => {
    const file = await zipFile("brief.odt", {
      "content.xml": `<office:document-content><text:p>Krebs cycle</text:p></office:document-content>`,
    });
    expect(docText(await extractStudyFile(file))).toContain("Krebs cycle");
  });
});

describe("toClaudeBlocks", () => {
  it("maps a text doc to a text block", () => {
    const blocks = toClaudeBlocks([{ kind: "doc", name: "a.txt", size: 4, ext: "txt", text: "hi" }]);
    expect(blocks).toEqual([{ type: "text", text: 'Document "a.txt":\n\nhi' }]);
  });

  it("maps a native pdf to a document block", () => {
    const blocks = toClaudeBlocks([{ kind: "pdf", name: "a.pdf", size: 10, base64: "AAA" }]);
    expect(blocks[0]).toEqual({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: "AAA" },
    });
  });
});

describe("describeStudyFileError", () => {
  it("falls back to unreadable for a generic throw", () => {
    expect(describeStudyFileError(new Error("boom"), "x.pdf", "en")).toContain("could not be read");
  });
});
