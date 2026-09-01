import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertImageKitFilePathMatchesContext,
  buildImagePath,
  buildImagePathPrefix,
  createImageUploadAuth,
  deleteImageKitFile,
  getFileExtension,
  getPrivateObject,
  isImageContentType,
  isImageKitConfigured,
  parsePositiveInt,
  sanitizePathSegment,
  validateTaskAssetUploadInput,
} from "../../../apps/api/src/storage/imagekit";

const IMAGEKIT_ENV_KEYS = [
  "IMAGEKIT_PUBLIC_KEY",
  "IMAGEKIT_PRIVATE_KEY",
  "IMAGEKIT_URL_ENDPOINT",
  "IMAGEKIT_MAX_UPLOAD_BYTES",
  "IMAGEKIT_UPLOAD_TTL_SECONDS",
] as const;

function setImageKitEnv(
  overrides: Partial<Record<(typeof IMAGEKIT_ENV_KEYS)[number], string>> = {},
) {
  process.env.IMAGEKIT_PUBLIC_KEY = "public_test";
  process.env.IMAGEKIT_PRIVATE_KEY = "private_test";
  process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/test-id";
  delete process.env.IMAGEKIT_MAX_UPLOAD_BYTES;
  delete process.env.IMAGEKIT_UPLOAD_TTL_SECONDS;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("ImageKit helpers", () => {
  const original: Partial<Record<string, string | undefined>> = {};

  beforeEach(() => {
    for (const key of IMAGEKIT_ENV_KEYS) {
      original[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const key of IMAGEKIT_ENV_KEYS) {
      const value = original[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    vi.restoreAllMocks();
  });

  it("recognizes allowed image content types case-insensitively", () => {
    expect(isImageContentType("IMAGE/PNG")).toBe(true);
    expect(isImageContentType("text/plain")).toBe(false);
  });

  it("parses positive integers with fallbacks", () => {
    expect(parsePositiveInt("42", 10)).toBe(42);
    expect(parsePositiveInt("0", 10)).toBe(10);
    expect(parsePositiveInt("nope", 10)).toBe(10);
  });

  it("sanitizes path segments and extracts normalized extensions", () => {
    expect(sanitizePathSegment(" Release Notes!!.PNG ")).toBe(
      "release-notes-.png",
    );
    expect(sanitizePathSegment("")).toBe("file");
    expect(getFileExtension("Screenshot.Final.PNG")).toBe("png");
    expect(getFileExtension("README")).toBe("file");
  });

  it("builds stable folder prefixes and file paths", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_717_171_717_000);

    const { folder, fileName, filePath } = buildImagePath({
      workspaceId: "Workspace 1",
      projectId: "Project 2",
      taskId: "Task 3",
      surface: "comment",
      filename: "Sprint Plan Final!!.PNG",
      contentType: "image/png",
    });

    expect(
      buildImagePathPrefix({
        workspaceId: "Workspace 1",
        projectId: "Project 2",
        taskId: "Task 3",
        surface: "comment",
      }),
    ).toBe("workspace/workspace-1/project/project-2/task/task-3/comments");

    expect(folder).toBe(
      "workspace/workspace-1/project/project-2/task/task-3/comments",
    );
    expect(fileName).toMatch(
      /^sprint-plan-final-1717171717000-[a-z0-9]+\.png$/,
    );
    expect(filePath).toBe(`${folder}/${fileName}`);
  });

  it("issues signed upload auth when ImageKit is configured", () => {
    setImageKitEnv({ IMAGEKIT_UPLOAD_TTL_SECONDS: "120" });
    vi.spyOn(Date, "now").mockReturnValue(1_717_171_717_000);

    const auth = createImageUploadAuth({
      workspaceId: "ws1",
      projectId: "p1",
      taskId: "t1",
      surface: "description",
      filename: "report.png",
      contentType: "image/png",
    });

    expect(auth.uploadUrl).toBe("https://upload.imagekit.io/v1/files/upload");
    expect(auth.folder).toBe(
      "workspace/ws1/project/p1/task/t1/descriptions",
    );
    expect(auth.filePath).toBe(`${auth.folder}/${auth.fileName}`);
    expect(auth.publicKey).toBe("public_test");
    expect(auth.token).toMatch(/^[0-9a-f-]{36}$/);
    expect(auth.expire).toBe(String(1_717_171_717 + 120));
    // Signature is HMAC-SHA1(privateKey, `${token}${expire}`), base64.
    const expected = createHmac("sha1", "private_test")
      .update(`${auth.token}${auth.expire}`)
      .digest("base64");
    expect(auth.signature).toBe(expected);
  });

  it("throws when ImageKit is not configured", () => {
    delete process.env.IMAGEKIT_PUBLIC_KEY;
    delete process.env.IMAGEKIT_PRIVATE_KEY;
    delete process.env.IMAGEKIT_URL_ENDPOINT;

    expect(isImageKitConfigured()).toBe(false);
    expect(() =>
      createImageUploadAuth({
        workspaceId: "ws1",
        projectId: "p1",
        taskId: "t1",
        surface: "description",
        filename: "report.png",
        contentType: "image/png",
      }),
    ).toThrow("ImageKit is not configured");
  });

  it("asserts the file path stays inside the task context", () => {
    setImageKitEnv();

    const ctx = {
      workspaceId: "ws1",
      projectId: "p1",
      taskId: "t1",
      surface: "description" as const,
    };
    const prefix = "workspace/ws1/project/p1/task/t1/descriptions";

    expect(
      assertImageKitFilePathMatchesContext(`${prefix}/image-1-abc.png`, ctx),
    ).toBe(true);

    for (const suffix of [
      "../../../../../../workspace/victim/secret.png",
      "nested/deeper.png",
      "..%2Fescape.png",
      ".hidden",
      "back\\slash.png",
    ]) {
      expect(
        assertImageKitFilePathMatchesContext(`${prefix}/${suffix}`, ctx),
      ).toBe(false);
    }

    expect(
      assertImageKitFilePathMatchesContext(
        "workspace/other/project/p1/task/t1/descriptions/image.png",
        ctx,
      ),
    ).toBe(false);
  });

  it("validates upload size against the configured maximum", () => {
    setImageKitEnv({ IMAGEKIT_MAX_UPLOAD_BYTES: "1048576" });

    expect(() => validateTaskAssetUploadInput("", 10)).toThrow(
      "A valid content type is required.",
    );
    expect(() => validateTaskAssetUploadInput("image/png", 0)).toThrow(
      "Upload size must be greater than zero.",
    );
    expect(() =>
      validateTaskAssetUploadInput("image/png", 2 * 1024 * 1024),
    ).toThrow("Upload exceeds the maximum upload size of 1MB.");
    expect(() =>
      validateTaskAssetUploadInput("image/png", 512),
    ).not.toThrow();
  });

  it("fetches private objects through a signed delivery URL", async () => {
    setImageKitEnv();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream(),
      headers: new Headers({
        "content-type": "image/png",
        "content-length": "12345",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const object = await getPrivateObject(
      "workspace/ws1/project/p1/task/t1/descriptions/image.png",
    );

    const [url] = fetchMock.mock.calls[0] as [string];
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://ik.imagekit.io");
    expect(parsed.pathname).toBe(
      "/test-id/workspace/ws1/project/p1/task/t1/descriptions/image.png",
    );
    expect(parsed.searchParams.has("ik-t")).toBe(true);
    expect(parsed.searchParams.has("ik-s")).toBe(true);

    expect(object.contentType).toBe("image/png");
    expect(object.contentLength).toBe("12345");

    vi.unstubAllGlobals();
  });

  it("throws when the private object cannot be fetched", async () => {
    setImageKitEnv();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );

    await expect(
      getPrivateObject("workspace/ws1/project/p1/task/t1/descriptions/x.png"),
    ).rejects.toThrow("ImageKit object not found");

    vi.unstubAllGlobals();
  });

  it("deletes files by ID with the private key as Basic auth", async () => {
    setImageKitEnv();

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal("fetch", fetchMock);

    await deleteImageKitFile("file_123");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.imagekit.io/v1/files/file_123");
    expect(init?.method).toBe("DELETE");
    const authorization = String(
      (init?.headers as Record<string, string>)?.Authorization ?? "",
    );
    expect(authorization.startsWith("Basic ")).toBe(true);

    vi.unstubAllGlobals();
  });

  it("treats a 404 on delete as success", async () => {
    setImageKitEnv();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    await expect(deleteImageKitFile("file_missing")).resolves.toBeUndefined();

    vi.unstubAllGlobals();
  });
});

vi.mock("../../../apps/api/src/database", () => ({ default: {} }));

const { contentReferencesAsset, extractAssetIds } = await import(
  "../../../apps/api/src/storage/cleanup-assets"
);

describe("extractAssetIds", () => {
  it("extracts asset IDs from content with /api/asset/ URLs", () => {
    const content =
      '<p>Hello <img src="http://localhost:1337/api/asset/abc123" /> world <img src="/api/asset/def456" /></p>';
    const ids = extractAssetIds(content);
    expect(ids).toEqual(new Set(["abc123", "def456"]));
  });

  it("returns empty set for null/undefined/empty content", () => {
    expect(extractAssetIds(null)).toEqual(new Set());
    expect(extractAssetIds(undefined)).toEqual(new Set());
    expect(extractAssetIds("")).toEqual(new Set());
  });

  it("returns empty set when no asset URLs are present", () => {
    expect(extractAssetIds("<p>No images here</p>")).toEqual(new Set());
  });

  it("deduplicates repeated asset IDs", () => {
    const content = "/api/asset/abc123 and again /api/asset/abc123";
    expect(extractAssetIds(content)).toEqual(new Set(["abc123"]));
  });

  it("does not treat asset ID prefixes as references", () => {
    expect(contentReferencesAsset("/api/asset/abc123xyz", "abc123")).toBe(
      false,
    );
    expect(contentReferencesAsset("/api/asset/abc123", "abc123")).toBe(true);
  });
});
