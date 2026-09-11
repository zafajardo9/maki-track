import { createHmac, randomUUID } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { config } from "dotenv-mono";

config();

const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const DEFAULT_UPLOAD_TTL_SECONDS = 300;
const DEFAULT_READ_TTL_SECONDS = 60;

const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/v1/files/upload";
const IMAGEKIT_API_URL = "https://api.imagekit.io";

const allowedImageMimeTypes = new Set([
  "image/apng",
  "image/avif",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export function isImageContentType(contentType: string) {
  return allowedImageMimeTypes.has(contentType.toLowerCase());
}

type UploadSurface = "description" | "comment";

type ImageKitConfig = {
  publicKey: string;
  privateKey: string;
  urlEndpoint: string;
  maxUploadBytes: number;
  uploadTtlSeconds: number;
};

type TaskImageUploadContext = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  surface: UploadSurface;
  filename: string;
  contentType: string;
};

export type ImageKitUploadAuth = {
  uploadUrl: string;
  folder: string;
  fileName: string;
  filePath: string;
  publicKey: string;
  signature: string;
  token: string;
  expire: string;
};

type AssetObject = {
  body: unknown;
  contentType: string | undefined;
  contentLength: string | undefined;
  etag: string | undefined;
  lastModified: Date | undefined;
};

function env(name: string) {
  return process.env[name]?.trim() || "";
}

export function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value?.trim() || "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function getConfig(): ImageKitConfig | null {
  const publicKey = env("IMAGEKIT_PUBLIC_KEY");
  const privateKey = env("IMAGEKIT_PRIVATE_KEY");
  const urlEndpoint = env("IMAGEKIT_URL_ENDPOINT");

  if (!publicKey || !privateKey || !urlEndpoint) {
    return null;
  }

  return {
    publicKey,
    privateKey,
    urlEndpoint: urlEndpoint.replace(/\/+$/, ""),
    maxUploadBytes: parsePositiveInt(
      process.env.IMAGEKIT_MAX_UPLOAD_BYTES,
      DEFAULT_MAX_UPLOAD_BYTES,
    ),
    uploadTtlSeconds: parsePositiveInt(
      process.env.IMAGEKIT_UPLOAD_TTL_SECONDS,
      DEFAULT_UPLOAD_TTL_SECONDS,
    ),
  };
}

/**
 * Whether uploads can happen at all: all three keys are required. This is what
 * the upload/finalize routes check before issuing a 503.
 */
export function isImageKitConfigured(): boolean {
  return getConfig() !== null;
}

// ImageKit digests everything it verifies as lowercase hex. The upload
// signature and the signed-delivery signature both use this; a base64 digest is
// rejected with a 400 on upload and a 403 on delivery.
function hmacSha1Hex(key: string, message: string): string {
  return createHmac("sha1", key).update(message).digest("hex");
}

export function sanitizePathSegment(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-+$/g, "") || "file"
  );
}

/**
 * Canonical form of a stored file path, with no leading slash.
 *
 * ImageKit always returns `filePath` with a leading slash (`/folder/file.png`),
 * even when the upload folder was sent without one, so the raw value cannot be
 * stored or compared directly. Everything here — the prefix check, the object
 * key, and the signed-URL string — works from this form.
 */
export function normalizeImageKitFilePath(filePath: string) {
  return filePath.trim().replace(/^\/+/, "");
}

export function getFileExtension(filename: string) {
  const normalized = filename.trim();
  const extension = normalized.includes(".")
    ? normalized.split(".").pop() || ""
    : "";

  return sanitizePathSegment(extension).slice(0, 12);
}

export function buildImagePathPrefix(
  context: Omit<TaskImageUploadContext, "filename" | "contentType">,
) {
  const surfaceFolder =
    context.surface === "comment" ? "comments" : "descriptions";

  return [
    "workspace",
    sanitizePathSegment(context.workspaceId),
    "project",
    sanitizePathSegment(context.projectId),
    "task",
    sanitizePathSegment(context.taskId),
    surfaceFolder,
  ].join("/");
}

export function buildImagePath(context: TaskImageUploadContext) {
  const extension = getFileExtension(context.filename);
  const folder = buildImagePathPrefix(context);
  const timestamp = Date.now();
  const randomId = createId();

  const baseName = sanitizePathSegment(
    context.filename.replace(/\.[^/.]+$/, "") || "image",
  ).slice(0, 64);

  const fileName = extension
    ? `${baseName}-${timestamp}-${randomId}.${extension}`
    : `${baseName}-${timestamp}-${randomId}`;

  return { folder, fileName, filePath: `${folder}/${fileName}` };
}

/**
 * Issue the parameters for a client-side (signed) ImageKit upload. The browser
 * POSTs the file bytes straight to ImageKit's upload endpoint with these
 * fields; the bytes never pass through the API. `filePath` is what finalize
 * validates and records.
 */
export function createImageUploadAuth(
  context: TaskImageUploadContext,
): ImageKitUploadAuth {
  const config = getConfig();
  if (!config) {
    throw new Error("ImageKit is not configured");
  }

  const { folder, fileName, filePath } = buildImagePath(context);
  const token = randomUUID();
  const expire = String(
    Math.floor(Date.now() / 1000) + config.uploadTtlSeconds,
  );
  // ImageKit's client-side upload signature is `HMAC-SHA1(privateKey,
  // token + expire)` as a hex digest. Sending base64 here makes ImageKit reject
  // every upload with "Your requests contains invalid signature parameter."
  const signature = hmacSha1Hex(config.privateKey, `${token}${expire}`);

  return {
    uploadUrl: IMAGEKIT_UPLOAD_URL,
    folder,
    fileName,
    filePath,
    publicKey: config.publicKey,
    signature,
    token,
    expire,
  };
}

export function validateTaskAssetUploadInput(
  contentType: string,
  size: number,
) {
  const config = getConfig();
  const maxUploadBytes = config?.maxUploadBytes ?? DEFAULT_MAX_UPLOAD_BYTES;

  if (!contentType.trim()) {
    throw new Error("A valid content type is required.");
  }

  if (size <= 0) {
    throw new Error("Upload size must be greater than zero.");
  }

  if (size > maxUploadBytes) {
    throw new Error(
      `Upload exceeds the maximum upload size of ${Math.floor(maxUploadBytes / (1024 * 1024))}MB.`,
    );
  }
}

/**
 * The folder prefix alone is not enough: gateways that normalize paths would
 * let a traversal suffix walk back out into another workspace's files.
 */
export function assertImageKitFilePathMatchesContext(
  filePath: string,
  context: Omit<TaskImageUploadContext, "filename" | "contentType">,
) {
  const fullPrefix = `${buildImagePathPrefix(context)}/`;
  const normalized = normalizeImageKitFilePath(filePath);

  if (!normalized.startsWith(fullPrefix)) {
    return false;
  }

  const suffix = normalized.slice(fullPrefix.length);
  return /^[A-Za-z0-9._-]+$/.test(suffix) && !suffix.startsWith(".");
}

/**
 * A short-lived signed delivery URL. ImageKit private files are only readable
 * through these.
 *
 * The string ImageKit expects to be signed is `<path><expire>` — the path
 * without its leading slash, expiry appended — digested as HMAC-SHA1 hex. A
 * leading slash, the reverse order, or a base64 digest each produce a 403.
 */
function buildSignedDeliveryUrl(config: ImageKitConfig, filePath: string) {
  const expire = Math.floor(Date.now() / 1000) + DEFAULT_READ_TTL_SECONDS;
  const path = normalizeImageKitFilePath(filePath);
  const signature = hmacSha1Hex(config.privateKey, `${path}${expire}`);

  return `${config.urlEndpoint}/${path}?ik-t=${expire}&ik-s=${signature}`;
}

/**
 * Fetch a private file from ImageKit server-side, using a signed URL, so the
 * authorized `/api/asset/:id` route can stream it back without exposing the
 * raw CDN URL.
 */
export async function getPrivateObject(filePath: string): Promise<AssetObject> {
  const config = getConfig();
  if (!config) {
    throw new Error("ImageKit is not configured");
  }

  const response = await fetch(buildSignedDeliveryUrl(config, filePath));

  if (!response.ok) {
    throw new Error("ImageKit object not found");
  }

  return {
    body: response.body,
    contentType: response.headers.get("content-type") ?? undefined,
    contentLength: response.headers.get("content-length") ?? undefined,
    etag: undefined,
    lastModified: undefined,
  };
}

/**
 * Delete a file by its ImageKit file ID. A 404 counts as success so cleanup
 * is idempotent when the file was already removed.
 */
export async function deleteImageKitFile(fileId: string): Promise<void> {
  const config = getConfig();
  if (!config) {
    return;
  }

  const authorization = `Basic ${Buffer.from(`${config.privateKey}:`).toString("base64")}`;

  const response = await fetch(
    `${IMAGEKIT_API_URL}/v1/files/${encodeURIComponent(fileId)}`,
    {
      method: "DELETE",
      headers: { Authorization: authorization },
    },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(`ImageKit delete failed with status ${response.status}`);
  }
}
