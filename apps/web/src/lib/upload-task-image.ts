import createImageUpload, {
  finalizeImageUpload,
} from "@/fetchers/task/create-image-upload";

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

type UploadSurface = "description" | "comment";

export function isSupportedImageFile(file: File) {
  return allowedImageMimeTypes.has(file.type.toLowerCase());
}

export function isSupportedTaskAsset(file: File) {
  return file.size > 0;
}

export function getImageAltText(filename: string) {
  return filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

export async function uploadTaskImage({
  taskId,
  surface,
  file,
}: {
  taskId: string;
  surface: UploadSurface;
  file: File;
}) {
  if (!isSupportedImageFile(file)) {
    if (!isSupportedTaskAsset(file)) {
      throw new Error("Only non-empty file uploads are supported.");
    }
  }

  const contentType = file.type || "application/octet-stream";

  const upload = await createImageUpload({
    taskId,
    filename: file.name || "image",
    contentType,
    size: file.size,
    surface,
  });

  const form = new FormData();
  form.append("file", file);
  form.append("fileName", upload.fileName);
  form.append("folder", upload.folder);
  form.append("useUniqueFileName", "false");
  form.append("isPrivateFile", "true");
  form.append("publicKey", upload.publicKey);
  form.append("signature", upload.signature);
  form.append("token", upload.token);
  form.append("expire", upload.expire);

  const uploadResponse = await fetch(upload.uploadUrl, {
    method: "POST",
    body: form,
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload file to storage.");
  }

  const result = (await uploadResponse.json()) as {
    fileId: string;
    filePath: string;
  };

  const asset = await finalizeImageUpload({
    taskId,
    filePath: result.filePath,
    fileId: result.fileId,
    filename: file.name || "image",
    contentType,
    size: file.size,
    surface,
  });

  return {
    url: asset.url,
    alt: getImageAltText(file.name || "image"),
    filename: file.name || "file",
    kind: isSupportedImageFile(file) ? "image" : "attachment",
    mimeType: contentType,
    size: file.size,
  };
}
