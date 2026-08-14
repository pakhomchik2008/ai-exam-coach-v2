/**
 * Canonical upload limits and validation (audit finding #2).
 *
 * Before this, the two upload surfaces disagreed and neither enforced anything:
 * the onboarding UploadZone accepted unlimited files of unlimited size, and the
 * Study tab silently took only `files[0]` and dropped the rest of a multi-file
 * drop without saying so. A student dragging in eight lecture PDFs got one
 * study set built from one of them and no explanation.
 *
 * These limits are the client half. The server half is a Supabase Storage bucket
 * policy — a client-side cap is a UX affordance, not a control, since anyone can
 * POST directly to the endpoint. See `supabase/12_storage_limits.sql`.
 */

export interface Limits {
  readonly maxFiles: number;
  readonly maxFileBytes: number;
  readonly maxTotalBytes: number;
}

/** Study material uploads — whole lecture decks and past papers. */
export const STUDY_LIMITS: Limits = {
  maxFiles: 20,
  maxFileBytes: 25 * 1024 * 1024,
  maxTotalBytes: 200 * 1024 * 1024,
};

/**
 * Chat attachments are tighter on purpose: every attached file is re-sent with
 * the whole conversation on each turn, so a generous cap here multiplies token
 * cost by the length of the thread, not just by the file.
 */
export const CHAT_LIMITS: Limits = {
  maxFiles: 5,
  maxFileBytes: 10 * 1024 * 1024,
  maxTotalBytes: 50 * 1024 * 1024,
};

export const MAX_FILES = STUDY_LIMITS.maxFiles;
export const MAX_FILE_BYTES = STUDY_LIMITS.maxFileBytes;
export const MAX_TOTAL_BYTES = STUDY_LIMITS.maxTotalBytes;

/** Extensions accepted across every upload surface. */
export const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".doc",
  ".pptx",
  ".ppt",
  ".xlsx",
  ".odt",
  ".odp",
  ".ods",
  ".txt",
  ".md",
  ".csv",
  ".rtf",
  ".html",
  ".htm",
  ".tex",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".heic",
  ".heif",
] as const;

/**
 * Ready-made value for an `<input type="file" accept=...>`. MIME wildcards
 * sit next to the extensions so a phone share-sheet PDF with no filename
 * suffix still shows up in the picker.
 */
export const ACCEPT_ATTRIBUTE = [
  ...ACCEPTED_EXTENSIONS,
  "application/pdf",
  "image/*",
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "application/rtf",
].join(",");

export type RejectionReason =
  | "too-many-files"
  | "file-too-large"
  | "total-too-large"
  | "unsupported-type";

export interface Rejection {
  readonly file: FileLike;
  readonly reason: RejectionReason;
}

export interface ValidationResult {
  /** Files that passed every check, in the order given. */
  readonly accepted: FileLike[];
  readonly rejected: Rejection[];
}

/** The parts of `File` this module needs — keeps it testable without the DOM. */
export interface FileLike {
  readonly name: string;
  readonly size: number;
  /** MIME type when the filename has no usable extension (phone share sheets). */
  readonly type?: string;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

export function isAcceptedType(name: string, mime = ""): boolean {
  if ((ACCEPTED_EXTENSIONS as readonly string[]).includes(extensionOf(name))) return true;
  const m = mime.toLowerCase().split(";")[0]?.trim() ?? "";
  if (!m) return false;
  if (m === "application/pdf" || m === "application/rtf") return true;
  if (m.startsWith("image/") && m !== "image/svg+xml") return true;
  if (m.startsWith("text/") && m !== "text/javascript" && m !== "text/css") return true;
  if (m.includes("wordprocessingml") || m.includes("presentationml") || m.includes("spreadsheetml")) return true;
  if (m.includes("opendocument")) return true;
  if (m === "application/msword" || m.includes("ms-powerpoint") || m.includes("ms-excel")) return true;
  return false;
}

/**
 * Validates an incoming batch against the limits, given whatever is already
 * attached.
 *
 * Checks run per file and in a fixed order (type, then per-file size, then the
 * count cap, then the running total) so that a file is reported with the first
 * reason it actually failed — a 40 MB `.exe` is rejected as an unsupported type,
 * not as an oversized one, which is the more useful message.
 */
export function validateFiles(
  incoming: readonly FileLike[],
  existing: readonly FileLike[] = [],
  limits: Limits = STUDY_LIMITS,
): ValidationResult {
  const accepted: FileLike[] = [];
  const rejected: Rejection[] = [];

  let count = existing.length;
  let total = existing.reduce((sum, f) => sum + f.size, 0);

  for (const file of incoming) {
    if (!isAcceptedType(file.name, file.type ?? "")) {
      rejected.push({ file, reason: "unsupported-type" });
      continue;
    }
    if (file.size > limits.maxFileBytes) {
      rejected.push({ file, reason: "file-too-large" });
      continue;
    }
    if (count >= limits.maxFiles) {
      rejected.push({ file, reason: "too-many-files" });
      continue;
    }
    if (total + file.size > limits.maxTotalBytes) {
      rejected.push({ file, reason: "total-too-large" });
      continue;
    }
    accepted.push(file);
    count += 1;
    total += file.size;
  }

  return { accepted, rejected };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

type Lang = "en" | "uk" | "ru" | "fr" | "de";

const MESSAGES: Record<RejectionReason, Record<Lang, (f: FileLike, l: Limits) => string>> = {
  "unsupported-type": {
    en: (f) => `${f.name} — unsupported file type`,
    uk: (f) => `${f.name} — непідтримуваний тип файлу`,
    ru: (f) => `${f.name} — неподдерживаемый тип файла`,
    fr: (f) => `${f.name} — type de fichier non pris en charge`,
    de: (f) => `${f.name} — nicht unterstützter Dateityp`,
  },
  "file-too-large": {
    en: (f, l) => `${f.name} is ${formatBytes(f.size)} — the limit is ${formatBytes(l.maxFileBytes)} per file`,
    uk: (f, l) => `${f.name} має ${formatBytes(f.size)} — ліміт ${formatBytes(l.maxFileBytes)} на файл`,
    ru: (f, l) => `${f.name} весит ${formatBytes(f.size)} — лимит ${formatBytes(l.maxFileBytes)} на файл`,
    fr: (f, l) => `${f.name} fait ${formatBytes(f.size)} — la limite est de ${formatBytes(l.maxFileBytes)} par fichier`,
    de: (f, l) => `${f.name} ist ${formatBytes(f.size)} groß — das Limit liegt bei ${formatBytes(l.maxFileBytes)} pro Datei`,
  },
  "too-many-files": {
    en: (_f, l) => `You can attach up to ${l.maxFiles} files`,
    uk: (_f, l) => `Можна додати щонайбільше ${l.maxFiles} файлів`,
    ru: (_f, l) => `Можно прикрепить не более ${l.maxFiles} файлов`,
    fr: (_f, l) => `Vous pouvez joindre jusqu'à ${l.maxFiles} fichiers`,
    de: (_f, l) => `Sie können bis zu ${l.maxFiles} Dateien anhängen`,
  },
  "total-too-large": {
    en: (_f, l) => `That would go over the ${formatBytes(l.maxTotalBytes)} total limit`,
    uk: (_f, l) => `Це перевищить загальний ліміт ${formatBytes(l.maxTotalBytes)}`,
    ru: (_f, l) => `Это превысит общий лимит ${formatBytes(l.maxTotalBytes)}`,
    fr: (_f, l) => `Cela dépasserait la limite totale de ${formatBytes(l.maxTotalBytes)}`,
    de: (_f, l) => `Das würde das Gesamtlimit von ${formatBytes(l.maxTotalBytes)} überschreiten`,
  },
};

/** A message naming the file and what to do, not a generic "upload failed". */
export function rejectionMessage(
  rejection: Rejection,
  lang: string = "en",
  limits: Limits = STUDY_LIMITS,
): string {
  const table = MESSAGES[rejection.reason];
  const key: Lang = (["en", "uk", "ru", "fr", "de"] as const).includes(lang as Lang)
    ? (lang as Lang)
    : "en";
  return table[key](rejection.file, limits);
}

/** One line summarising a batch, for a toast. */
export function rejectionSummary(
  rejected: readonly Rejection[],
  lang: string = "en",
  limits: Limits = STUDY_LIMITS,
): string {
  if (rejected.length === 0) return "";
  const first = rejectionMessage(rejected[0]!, lang, limits);
  if (rejected.length === 1) return first;
  const more = rejected.length - 1;
  const suffix: Record<Lang, string> = {
    en: `and ${more} more`,
    uk: `та ще ${more}`,
    ru: `и ещё ${more}`,
    fr: `et ${more} de plus`,
    de: `und ${more} weitere`,
  };
  const key: Lang = (["en", "uk", "ru", "fr", "de"] as const).includes(lang as Lang)
    ? (lang as Lang)
    : "en";
  return `${first} — ${suffix[key]}`;
}
