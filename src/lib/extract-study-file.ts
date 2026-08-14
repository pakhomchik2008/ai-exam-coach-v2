/**
 * Turns a dropped File into Claude-ready descriptors.
 *
 * Three upload surfaces (Study Tools, chat attach, onboarding enrichment)
 * used to each decode files themselves, and two of them encoded PDFs with
 * `btoa(String.fromCharCode(...bytes))` which RangeErrors past ~64 KB — so a
 * real lecture PDF never reached the model. This module is the one decoder:
 * text comes out of PDFs via pdf.js (sending the raw file would blow Vercel's
 * ~4.5 MB body cap), Office/OpenDocument via JSZip, images via the existing
 * resizer. Legacy OLE `.doc`/`.ppt` get a "save as .docx" message instead of
 * a silent zip failure.
 */

import JSZip from "jszip";
import { bytesToBase64 } from "./bytes-to-base64";
import { MAX_IMAGE_EDGE_PX, resizeImageFile } from "./image-resize";

export const TEXT_CHAR_CAP = 80_000;
const MIN_PDF_TEXT_CHARS = 80;
const MAX_PDF_TEXT_PAGES = 50;
const MAX_SCAN_PAGES = 4;
const MAX_NATIVE_PDF_BYTES = 1_200_000;
const MAX_SLIDES = 40;

export type ExtractedStudyFile =
  | {
      kind: "image";
      name: string;
      size: number;
      base64: string;
      mimeType: string;
      dataUrl: string;
    }
  | { kind: "pdf"; name: string; size: number; base64: string }
  | { kind: "doc"; name: string; size: number; ext: string; text: string };

export type ClaudeBlock =
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
  | { type: "text"; text: string };

export type StudyFileErrorCode =
  | "ole-legacy"
  | "empty"
  | "password"
  | "unreadable"
  | "unsupported"
  | "heic";

export class StudyFileError extends Error {
  readonly code: StudyFileErrorCode;
  constructor(code: StudyFileErrorCode, message: string) {
    super(message);
    this.name = "StudyFileError";
    this.code = code;
  }
}

type Lang = "en" | "uk" | "ru" | "fr" | "de";

const ERROR_MESSAGES: Record<StudyFileErrorCode, Record<Lang, (name: string) => string>> = {
  "ole-legacy": {
    en: (n) => `${n} is an old .doc/.ppt — save as .docx or .pptx and drop that`,
    uk: (n) => `${n} — старий .doc/.ppt. Збережіть як .docx або .pptx і закиньте знову`,
    ru: (n) => `${n} — старый .doc/.ppt. Сохраните как .docx или .pptx и закиньте снова`,
    fr: (n) => `${n} est un ancien .doc/.ppt — enregistrez en .docx ou .pptx`,
    de: (n) => `${n} ist ein altes .doc/.ppt — speichere als .docx oder .pptx`,
  },
  empty: {
    en: (n) => `${n} has no extractable text`,
    uk: (n) => `${n} — немає тексту, який можна витягти`,
    ru: (n) => `${n} — нет текста, который можно извлечь`,
    fr: (n) => `${n} ne contient pas de texte extractible`,
    de: (n) => `${n} enthält keinen extrahierbaren Text`,
  },
  password: {
    en: (n) => `${n} is password-protected — unlock it and drop again`,
    uk: (n) => `${n} захищений паролем — зніміть захист і закиньте знову`,
    ru: (n) => `${n} защищён паролем — снимите защиту и закиньте снова`,
    fr: (n) => `${n} est protégé par mot de passe — déverrouillez-le`,
    de: (n) => `${n} ist passwortgeschützt — entsperre und erneut ablegen`,
  },
  unreadable: {
    en: (n) => `${n} — could not be read`,
    uk: (n) => `${n} — не вдалося прочитати`,
    ru: (n) => `${n} — не удалось прочитать`,
    fr: (n) => `${n} — lecture impossible`,
    de: (n) => `${n} — nicht lesbar`,
  },
  unsupported: {
    en: (n) => `${n} — unsupported file type`,
    uk: (n) => `${n} — непідтримуваний тип файлу`,
    ru: (n) => `${n} — неподдерживаемый тип файла`,
    fr: (n) => `${n} — type de fichier non pris en charge`,
    de: (n) => `${n} — nicht unterstützter Dateityp`,
  },
  heic: {
    en: (n) => `${n} is HEIC — export as JPEG and drop that`,
    uk: (n) => `${n} — HEIC. Експортуйте в JPEG і закиньте знову`,
    ru: (n) => `${n} — HEIC. Экспортируйте в JPEG и закиньте снова`,
    fr: (n) => `${n} est en HEIC — exportez en JPEG`,
    de: (n) => `${n} ist HEIC — exportiere als JPEG`,
  },
};

function resolveLang(lang: string): Lang {
  return (["en", "uk", "ru", "fr", "de"] as const).includes(lang as Lang) ? (lang as Lang) : "en";
}

export function describeStudyFileError(err: unknown, name: string, lang = "en"): string {
  const key = resolveLang(lang);
  if (err instanceof StudyFileError) return ERROR_MESSAGES[err.code][key](name);
  return ERROR_MESSAGES.unreadable[key](name);
}

export function toClaudeBlocks(files: readonly ExtractedStudyFile[]): ClaudeBlock[] {
  return files.map((f) => {
    if (f.kind === "image") {
      return { type: "image", source: { type: "base64", media_type: f.mimeType, data: f.base64 } };
    }
    if (f.kind === "pdf") {
      return { type: "document", source: { type: "base64", media_type: "application/pdf", data: f.base64 } };
    }
    return { type: "text", text: `Document "${f.name}":\n\n${f.text}` };
  });
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

function readAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
  // jsdom's Blob has neither arrayBuffer nor text — FileReader is the common
  // path that works in tests and in every browser we actually ship to.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsArrayBuffer(blob);
  });
}

function readAsText(blob: Blob): Promise<string> {
  if (typeof blob.text === "function") return blob.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsText(blob);
  });
}

function isOleCompound(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
}

function isZip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function capText(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, TEXT_CHAR_CAP);
}

function xmlToText(xml: string, closeTag: RegExp): string {
  const d = document.createElement("div");
  d.innerHTML = xml.replace(closeTag, " ").replace(/<[^>]+>/g, " ");
  return (d.textContent || "").replace(/\s+/g, " ").trim();
}

function stripRtf(raw: string): string {
  return raw
    .replace(/\\'[0-9a-fA-F]{2}/g, " ")
    .replace(/\\[a-zA-Z]+-?\d* ?/g, " ")
    .replace(/[{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(raw: string): string {
  const d = document.createElement("div");
  d.innerHTML = raw.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  return (d.textContent || "").replace(/\s+/g, " ").trim();
}

function asDoc(file: File, ext: string, text: string): ExtractedStudyFile {
  const clipped = capText(text);
  if (!clipped) throw new StudyFileError("empty", `${file.name} empty`);
  return { kind: "doc", name: file.name, size: file.size, ext, text: clipped };
}

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp", "heic", "heif"]);
const TEXT_EXTS = new Set(["txt", "md", "csv", "tex"]);
const OFFICE_EXTS = new Set(["docx", "doc", "pptx", "ppt", "xlsx", "odt", "odp", "ods"]);

async function extractImage(file: File): Promise<ExtractedStudyFile[]> {
  const ext = extensionOf(file.name);
  try {
    const resized = await resizeImageFile(file);
    return [{
      kind: "image",
      name: file.name,
      size: file.size,
      base64: resized.base64,
      mimeType: resized.mimeType,
      dataUrl: resized.dataUrl,
    }];
  } catch {
    if (ext === "heic" || ext === "heif" || (file.type || "").includes("heic") || (file.type || "").includes("heif")) {
      throw new StudyFileError("heic", file.name);
    }
    throw new StudyFileError("unreadable", file.name);
  }
}

async function extractPdf(file: File, bytes: Uint8Array): Promise<ExtractedStudyFile[]> {
  try {
    const pdfjs = await import("pdfjs-dist");
    const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    const pageCount = Math.min(pdf.numPages, MAX_PDF_TEXT_PAGES);
    let text = "";
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => (item && typeof item === "object" && "str" in item ? String((item as { str: unknown }).str) : ""))
        .join(" ");
      text += `${pageText}\n`;
      if (text.length >= TEXT_CHAR_CAP) break;
    }

    const compact = text.replace(/\s+/g, " ").trim();
    if (compact.replace(/\s/g, "").length >= MIN_PDF_TEXT_CHARS) {
      return [asDoc(file, "pdf", compact)];
    }

    const images: ExtractedStudyFile[] = [];
    const scanPages = Math.min(pdf.numPages, MAX_SCAN_PAGES);
    for (let i = 1; i <= scanPages; i++) {
      const page = await pdf.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(1.6, MAX_IMAGE_EDGE_PX / Math.max(base.width, base.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      const base64 = dataUrl.split(",")[1] ?? "";
      if (!base64) continue;
      images.push({
        kind: "image",
        name: `${file.name} p.${i}`,
        size: file.size,
        base64,
        mimeType: "image/jpeg",
        dataUrl,
      });
    }
    if (images.length) return images;
  } catch (err) {
    const name = err && typeof err === "object" && "name" in err ? String((err as { name: unknown }).name) : "";
    if (name === "PasswordException") throw new StudyFileError("password", file.name);
    if (err instanceof StudyFileError) throw err;
  }

  // pdf.js failed (worker, jsdom, corrupt file). A small PDF can still go as a
  // native Anthropic document block; a large one would blow the Vercel body cap.
  if (file.size <= MAX_NATIVE_PDF_BYTES) {
    return [{ kind: "pdf", name: file.name, size: file.size, base64: bytesToBase64(bytes) }];
  }
  throw new StudyFileError("unreadable", file.name);
}

async function extractOffice(file: File, bytes: Uint8Array, ext: string, mime: string): Promise<ExtractedStudyFile[]> {
  if (isOleCompound(bytes) || ext === "doc" || ext === "ppt") {
    if (!isZip(bytes)) throw new StudyFileError("ole-legacy", file.name);
  }
  const zip = await JSZip.loadAsync(bytes);
  let text = "";

  const asPpt = ext === "pptx" || ext === "ppt" || mime.includes("presentationml") || mime.includes("powerpoint");
  const asXls = ext === "xlsx" || mime.includes("spreadsheetml") || mime.includes("ms-excel");
  const asOdf = ext === "odt" || ext === "odp" || ext === "ods" || mime.includes("opendocument");

  if (asXls) {
    const shared = zip.file("xl/sharedStrings.xml");
    if (shared) {
      const xml = await shared.async("string");
      text = [...xml.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1] ?? "").join(" ");
    }
    const sheets = Object.keys(zip.files)
      .filter((f) => /^xl\/worksheets\/sheet\d+\.xml$/.test(f))
      .sort();
    for (const s of sheets.slice(0, 8)) {
      const xml = await zip.files[s]!.async("string");
      const nums = [...xml.matchAll(/<v>([^<]+)<\/v>/g)].map((m) => m[1] ?? "");
      if (nums.length) text += `\n${nums.join(" ")}`;
    }
  } else if (asOdf) {
    const content = zip.file("content.xml");
    if (content) text = xmlToText(await content.async("string"), /<\/text:p>/g);
  } else if (asPpt) {
    const slides = Object.keys(zip.files)
      .filter((f) => /ppt\/slides\/slide\d+\.xml$/.test(f))
      .sort((a, b) => {
        const na = parseInt(a.match(/\d+/g)?.pop() ?? "0", 10);
        const nb = parseInt(b.match(/\d+/g)?.pop() ?? "0", 10);
        return na - nb;
      });
    for (const s of slides.slice(0, MAX_SLIDES)) {
      const xml = await zip.files[s]!.async("string");
      text += `${xmlToText(xml, /<\/a:t>/g)}\n`;
    }
  } else {
    const doc = zip.file("word/document.xml");
    if (doc) text = xmlToText(await doc.async("string"), /<\/w:t>/g);
  }

  return [asDoc(file, ext || "docx", text)];
}

export async function extractStudyFile(file: File): Promise<ExtractedStudyFile[]> {
  const name = file.name || "file";
  const ext = extensionOf(name);
  const mime = (file.type || "").toLowerCase();

  if (mime.startsWith("image/") || IMAGE_EXTS.has(ext)) {
    if (mime === "image/svg+xml" || ext === "svg") throw new StudyFileError("unsupported", name);
    return extractImage(file);
  }

  if (ext === "pdf" || mime === "application/pdf") {
    const bytes = new Uint8Array(await readAsArrayBuffer(file));
    return extractPdf(file, bytes);
  }

  if (ext === "rtf" || mime === "application/rtf" || mime === "text/rtf") {
    return [asDoc(file, "rtf", stripRtf(await readAsText(file)))];
  }

  if (ext === "html" || ext === "htm" || mime === "text/html") {
    return [asDoc(file, "html", stripHtml(await readAsText(file)))];
  }

  if (TEXT_EXTS.has(ext) || mime.startsWith("text/")) {
    return [asDoc(file, ext || "txt", await readAsText(file))];
  }

  if (OFFICE_EXTS.has(ext) || mime.includes("wordprocessingml") || mime.includes("presentationml")
    || mime.includes("spreadsheetml") || mime.includes("opendocument")
    || mime === "application/msword" || mime.includes("ms-powerpoint") || mime.includes("ms-excel")) {
    const bytes = new Uint8Array(await readAsArrayBuffer(file));
    return extractOffice(file, bytes, ext, mime);
  }

  throw new StudyFileError("unsupported", name);
}
