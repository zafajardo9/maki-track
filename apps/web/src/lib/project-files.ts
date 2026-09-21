export type FileCategory =
  | "image"
  | "pdf"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "archive"
  | "audio"
  | "video"
  | "text"
  | "other";

// An extension is the only signal left when a browser reports
// `application/octet-stream` for a file it does not recognise.
const EXTENSION_CATEGORIES: Record<string, FileCategory> = {
  csv: "spreadsheet",
  doc: "document",
  docx: "document",
  gif: "image",
  gz: "archive",
  jpeg: "image",
  jpg: "image",
  key: "presentation",
  log: "text",
  md: "text",
  odp: "presentation",
  ods: "spreadsheet",
  odt: "document",
  pdf: "pdf",
  png: "image",
  ppt: "presentation",
  pptx: "presentation",
  rar: "archive",
  rtf: "document",
  tar: "archive",
  txt: "text",
  webp: "image",
  xls: "spreadsheet",
  xlsx: "spreadsheet",
  zip: "archive",
};

const MIME_CATEGORIES: Record<string, FileCategory> = {
  "application/gzip": "archive",
  "application/json": "text",
  "application/msword": "document",
  "application/pdf": "pdf",
  "application/rtf": "document",
  "application/vnd.ms-excel": "spreadsheet",
  "application/vnd.ms-powerpoint": "presentation",
  "application/vnd.oasis.opendocument.presentation": "presentation",
  "application/vnd.oasis.opendocument.spreadsheet": "spreadsheet",
  "application/vnd.oasis.opendocument.text": "document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "spreadsheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "document",
  "application/x-7z-compressed": "archive",
  "application/x-rar-compressed": "archive",
  "application/x-tar": "archive",
  "application/xml": "text",
  "application/zip": "archive",
  "text/csv": "spreadsheet",
  "text/markdown": "text",
  "text/plain": "text",
};

export function getFileExtension(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  // A leading dot marks a hidden file rather than an extension, and a trailing
  // dot has nothing after it.
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function getFileCategory(
  mimeType: string | null | undefined,
  filename = "",
): FileCategory {
  const normalized = (mimeType ?? "").toLowerCase().split(";")[0]?.trim() ?? "";

  if (normalized.startsWith("image/")) return "image";
  if (normalized.startsWith("audio/")) return "audio";
  if (normalized.startsWith("video/")) return "video";
  if (normalized.startsWith("text/")) return "text";

  const byMimeType = MIME_CATEGORIES[normalized];
  if (byMimeType) return byMimeType;

  return EXTENSION_CATEGORIES[getFileExtension(filename)] ?? "other";
}

const FILE_SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    FILE_SIZE_UNITS.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  // Whole bytes never need a decimal, and past 100 the decimal stops carrying
  // information at this width.
  const digits = exponent === 0 || value >= 100 ? 0 : 1;

  return `${value.toFixed(digits)} ${FILE_SIZE_UNITS[exponent]}`;
}
