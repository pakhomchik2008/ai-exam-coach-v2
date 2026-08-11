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
 * POST directly to the endpoint. See `supabase/11_storage_limits.sql`.
 */

export const MAX_FILES = 20;
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_TOTAL_BYTES = 200 * 1024 * 1024; // 200 MB

/** Extensions accepted across every upload surface. */
export const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".doc",
  ".pptx",
  ".ppt",
  ".txt",
  ".jpg",
  ".jpeg",
  ".png",
] as const;

/** Ready-made value for an `<input type="file" accept=...>`. */
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(",");

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
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

export function isAcceptedType(name: string): boolean {
  return (ACCEPTED_EXTENSIONS as readonly string[]).includes(extensionOf(name));
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
): ValidationResult {
  const accepted: FileLike[] = [];
  const rejected: Rejection[] = [];

  let count = existing.length;
  let total = existing.reduce((sum, f) => sum + f.size, 0);

  for (const file of incoming) {
    if (!isAcceptedType(file.name)) {
      rejected.push({ file, reason: "unsupported-type" });
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      rejected.push({ file, reason: "file-too-large" });
      continue;
    }
    if (count >= MAX_FILES) {
      rejected.push({ file, reason: "too-many-files" });
      continue;
    }
    if (total + file.size > MAX_TOTAL_BYTES) {
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

const MESSAGES: Record<RejectionReason, Record<Lang, (f: FileLike) => string>> = {
  "unsupported-type": {
    en: (f) => `${f.name} — unsupported file type`,
    uk: (f) => `${f.name} — непідтримуваний тип файлу`,
    ru: (f) => `${f.name} — неподдерживаемый тип файла`,
    fr: (f) => `${f.name} — type de fichier non pris en charge`,
    de: (f) => `${f.name} — nicht unterstützter Dateityp`,
  },
  "file-too-large": {
    en: (f) => `${f.name} is ${formatBytes(f.size)} — the limit is ${formatBytes(MAX_FILE_BYTES)} per file`,
    uk: (f) => `${f.name} має ${formatBytes(f.size)} — ліміт ${formatBytes(MAX_FILE_BYTES)} на файл`,
    ru: (f) => `${f.name} весит ${formatBytes(f.size)} — лимит ${formatBytes(MAX_FILE_BYTES)} на файл`,
    fr: (f) => `${f.name} fait ${formatBytes(f.size)} — la limite est de ${formatBytes(MAX_FILE_BYTES)} par fichier`,
    de: (f) => `${f.name} ist ${formatBytes(f.size)} groß — das Limit liegt bei ${formatBytes(MAX_FILE_BYTES)} pro Datei`,
  },
  "too-many-files": {
    en: () => `You can attach up to ${MAX_FILES} files`,
    uk: () => `Можна додати щонайбільше ${MAX_FILES} файлів`,
    ru: () => `Можно прикрепить не более ${MAX_FILES} файлов`,
    fr: () => `Vous pouvez joindre jusqu'à ${MAX_FILES} fichiers`,
    de: () => `Sie können bis zu ${MAX_FILES} Dateien anhängen`,
  },
  "total-too-large": {
    en: () => `That would go over the ${formatBytes(MAX_TOTAL_BYTES)} total limit`,
    uk: () => `Це перевищить загальний ліміт ${formatBytes(MAX_TOTAL_BYTES)}`,
    ru: () => `Это превысит общий лимит ${formatBytes(MAX_TOTAL_BYTES)}`,
    fr: () => `Cela dépasserait la limite totale de ${formatBytes(MAX_TOTAL_BYTES)}`,
    de: () => `Das würde das Gesamtlimit von ${formatBytes(MAX_TOTAL_BYTES)} überschreiten`,
  },
};

/** A message naming the file and what to do, not a generic "upload failed". */
export function rejectionMessage(rejection: Rejection, lang: string = "en"): string {
  const table = MESSAGES[rejection.reason];
  const key: Lang = (["en", "uk", "ru", "fr", "de"] as const).includes(lang as Lang)
    ? (lang as Lang)
    : "en";
  return table[key](rejection.file);
}

/** One line summarising a batch, for a toast. */
export function rejectionSummary(rejected: readonly Rejection[], lang: string = "en"): string {
  if (rejected.length === 0) return "";
  const first = rejectionMessage(rejected[0]!, lang);
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
